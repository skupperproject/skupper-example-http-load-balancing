# Deploying multiple http services for anycast access across cluster

This tutorial demonstrates how to deploy a set of http servers across multiple clusters and observe anycast application routing over a Virtual Application Network.

In this tutorial, you will deploy http servers to both a public and a private cluster. You will also create http clients that will access the http servers via the same address. You will observe how the VAN supports anycast application addressing by balancing client requests across the https servers on both the public and private cluster.

An example deployment topolgy that you will work towards in this tutorial is as follows:

![](docs/images/anycast_routing_topology.png)

To complete this tutorial, do the following:

* [Prerequisites](#prerequisites)
* [Step 1: Set up the demo](#step-1-set-up-the-demo)
* [Step 2: Deploy the Virtual Application Network](#step-2-deploy-the-virtual-application-network)
* [Step 3: Deploy the HTTP service](#step-3-deploy-the-http-service)
* [Step 4: Create Skupper service for the Virtual Application Network](#step-4-create-skupper-service-for-the-virtual-application-network)
* [Step 5: Bind the Skupper service to the deployment target on the Virtual Application Network](#step-5-bind-the-skupper-service-to-the-deployment-target-on-the-virtual-application-network)
* [Step 6: Deploy HTTP client](#step-6-deploy-http-client)
* [Step 7: Review HTTP client metrics](#step-7-review-http-client-metrics)
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

1. In the terminal for the first public cluster, deploy the **public1** application router and create three connection tokens for linking from the **public2** cluster, the **private1** cluster and the **private2** cluster:

   ```bash
   skupper init --site-name public1 --site-name public1 --enable-console --enable-flow-collector
   skupper token create private1-to-public1-token.yaml
   skupper token create private2-to-public1-token.yaml
   skupper token create public2-to-public1-token.yaml
   ```

2. In the terminal for the second public cluster, deploy the **public2** application router, create two connection tokens for linking from the **private1** and **private2** clusters, and link to the **public1** cluster:

   ```bash
   skupper init --site-name public2
   skupper token create private1-to-public2-token.yaml
   skupper token create private2-to-public2-token.yaml
   skupper link create public2-to-public1-token.yaml
   ```

3. In the terminal for the first private cluster, deploy the **private1** application router and define its links to the **public1** and **public2** clusters

   ```bash
   skupper init --site-name private1
   skupper link create private1-to-public1-token.yaml
   skupper link create private1-to-public2-token.yaml
   ```

4. In the terminal for the second private cluster, deploy the **private2** application router and define its links to the **public1** and **public2** clusters

   ```bash
   skupper init --site-name private2
   skupper link create private2-to-public1-token.yaml
   skupper link create private2-to-public2-token.yaml
   ```

   At this point, you should see a network topology similar to the following:

    ![](docs/images/anycast_routing_links_created.png)

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

   ![](docs/images/http_servers_added.png)

## Step 4: Create Skupper service for the Virtual Application Network

1. In the terminal for the **public1** cluster, create the httpsvc service:

   ```bash
   skupper service create httpsvc 8080 --mapping http
   ```
   ![](docs/images/skupper_service_created.png)

2. In each of the cluster terminals, verify the service created is present

   ```bash
   skupper service status
   ```

## Step 5: Bind the Skupper service to the deployment target on the Virtual Application Network

1. In the terminal for the **public1** cluster, bind the httpsvc to the http-server deployment:

   ```bash
   skupper service bind httpsvc deployment http-server
   ```

2. In the terminal for the **private1** cluster, bind the httpsvc to the http-server deployment:

   ```bash
   skupper service bind httpsvc deployment http-server
   ```

   Notice the change in the type of *process*  (from *unexposed* to *exposed*):

   ![](docs/images/skupper_service_binding.png)

## Step 6: Deploy HTTP client

1. In the terminal for the **public2** cluster, deploy the following:

   ```bash
   kubectl apply -f ~/http-demo/skupper-example-http-load-balancing/client.yaml
   ```

2. In the terminal for the **private2** cluster, deploy the following:

   ```bash
   kubectl apply -f ~/http-demo/skupper-example-http-load-balancing/client.yaml
   ```

## Step 7: Review HTTP client metrics

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
   ![](docs/images/http_client_deployed.png)

   Notice that requests from the two http clients (in *public2* and *private2*) are now load-balanced to all replicas of the http servers at each site (*public1* and *private1).

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
