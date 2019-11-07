# Deploying multiple http services for anycast access across cluster

This tutorial demonstrates how to deploy a set of http servers across multiple clusters and observe anycast application routing over a Virtual Application Network.

In this tutorial, you will deploy http servers to both a public and a private cluster. You will also create http clients that will access the http servers via the same address. You will observe how the VAN supports anycast application addressing by balancing client requests across the https servers on both the public and private cluster.

To complete this tutorial, do the following:

* [Prerequisites](#prerequisites)
* [Step 1: Set up the demo](#step-1-set-up-the-demo)
* [Step 2: Deploy the Virtual Application Network](#step-2-deploy-the-virtual-application-network)
* [Step 3: Deploy the HTTP service](#step-3-deploy-the-http-service)
* [Step 4: Annotate HTTP service to join the Virtual Application Network](#step-4-annotate-http-service-to-join-the-virtual-application-network)
* [Step 5: Deploy HTTP client](#step-5-deploy-http-client)
* [Step 6: Review HTTP client metrics](#step-6-review-http-client-metrics)
* [Cleaning up](#cleaning-up)
* [Next steps](#next-steps)

## Prerequisites

* The `kubectl` command-line tool, version 1.15 or later ([installation guide](https://kubernetes.io/docs/tasks/tools/install-kubectl/))
* The `skupper` command-line tool, the latest version ([installation guide](https://skupper.io/start/index.html#step-1-install-the-skupper-command-line-tool-in-your-environment))

The basis for the demonstration is to depict the operation of multiple http server deployment in both a private and public cluster and http client access to the servers from any of the namespaces (public and private) on the Virtal Application Network. As an example, the cluster deployment might be comprised of:

* Two "private cloud" cluster running on your local machine or in a data center
* Two public cloud clusters running in public cloud providers

While the detailed steps are not included here, this demonstration can alternatively be performed with four separate namespaces on a single cluster.

## Step 1: Set up the demo

1. On your local machine, make a directory for this tutorial and clone the example repo:

   ```bash
   mkdir http-demo
   cd http-demo
   git clone https://github.com/skupperproject/skupper-example-http-load-balancing.git
   ```

2. Prepare the target clusters.

   1. On your local machine, log in to each cluster in a separate terminal session.
   2. In each cluster, create a namespace to use for the demo.
   3. In each cluster, set the kubectl config context to use the demo namespace [(see kubectl cheat sheet)](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

## Step 2: Deploy the Virtual Application Network

On each cluster, define the virtual application network and the connectivity for the peer clusters.

1. In the terminal for the first public cluster, deploy the **public1** application router and create three connection tokens for connections from the **public2** cluster, the **private1** cluster and the **private2** cluster:

   ```bash
   skupper init --id public1
   skupper connection-token private1-to-public1-token.yaml
   skupper connection-token private2-to-public1-token.yaml
   skupper connection-token public2-to-public1-token.yaml
   ```

2. In the terminal for the second public cluster, deploy the **public2** application router, create two connection tokens for connections from the **private1** and **private2** clusters, and connect to the **public1** cluster:

   ```bash
   skupper init --id public2
   skupper connection-token private1-to-public2-token.yaml
   skupper connection-token private2-to-public2-token.yaml
   skupper connect public2-to-public1-token.yaml
   ```

3. In the terminal for the first private cluster, deploy the **private1** application router and define its connections to the **public1** and **public2** clusters

   ```bash
   skupper init --edge --id private1
   skupper connect private1-to-public1-token.yaml
   skupper connect private1-to-public2-token.yaml
   ```

4. In the terminal for the second private cluster, deploy the **private2** application router and define its connections to the **public1** and **public2** clusters

   ```bash
   skupper init --edge --id private2
   skupper connect private2-to-public1-token.yaml
   skupper connect private2-to-public2-token.yaml
   ```

## Step 3: Deploy the HTTP service

After creating the application router network, deploy the HTTP services. The **private1** and **public1** clusters will be used to deploy the HTTP servers and the **public2** and **private2** clusters will be used to enable client http communications to the servers.

1. In the terminal for the **public1** cluster, deploy the following:

   ```bash
   kubectl apply -f ~/http-demo/skupper-example-http-load-balancing/server.yaml
   ```

2. In the terminal for the **private1** cluster, deploy the following:

   ```bash
   kubectl apply -f ~/http-demo/skupper-example-http-load-balancing/server.yaml
   ```

## Step 4: Annotate HTTP service to join to the Virtual Application Network

1. In the terminal for the **public1** cluster, annotate the httpsvc service:

   ```bash
   kubectl annotate service httpsvc skupper.io/proxy=http
   ```

2. In the terminal for the **private1** cluster, annotate the httpsvc service:

   ```bash
   kubectl annotate service httpsvc skupper.io/proxy=http
   ```

## Step 5: Deploy HTTP client

1. In the terminal for the **public2** cluster, deploy the following:

   ```bash
   kubectl apply -f ~/http-demo/skupper-example-http-load-balancing/client.yaml
   ```

2. In the terminal for the **private2** cluster, deploy the following:

   ```bash
   kubectl apply -f ~/http-demo/skupper-example-http-load-balancing/client.yaml
   ```

## Step 6: Review HTTP client metrics

The deployed http clients issue concurrent requests to the httpsvc. The http client
monitors which of the http server pods deployed on the **public1** and **private1** clusters
served the request and calculates the rates per server-pod.

1. In the terminal for the **public2** cluster, review the logs generated by the http client:

   ```bash
   kubectl logs $(kubectl get pod -l application=http-client -o=jsonpath='{.items[0].metadata.name}')
   ```

2. In the terminal for the **private2** cluster, review the logs generated by the http client:

   ```bash
   kubectl logs $(kubectl get pod -l application=http-client -o=jsonpath='{.items[0].metadata.name}')
   ```

## Cleaning Up

Restore your cluster environment by returning the resources created in the demonstration. On each cluster, delete the demo resources and the virtual application network:

1. In the terminal for the **public1** cluster, delete the resources:

   ```bash
   $ kubectl delete -f ~/http-demo/skupper-example-http-load-balancing/server.yaml
   $ skupper delete
   ```

2. In the terminal for the **public2** cluster, delete the resources:

   ```bash
   $ kubectl delete -f ~/http-demo/skupper-example-http-load-balancing/client.yaml
   $ skupper delete
   ```

3. In the terminal for the **private1** cluster, delete the resources:

   ```bash
   $ kubectl delete -f ~/http-demo/skupper-example-http-load-balancing/server.yaml
   $ skupper delete
   ```

4. In the terminal for the **private2** cluster, delete the resources:

   ```bash
   $ kubectl delete -f ~/http-demo/skupper-example-http-load-balancing/client.yaml
   $ skupper delete
   ```

## Next steps

 - [Try the Bookinfo example for distributing application http services](https://github.com/skupperproject/skupper-example-bookinfo)
 - [Try the Hipster Shop example for distributing application microservices](https://github.com/skupperproject/skupper-example-microservices)
 - [Find more examples](https://skupper.io/examples/)
