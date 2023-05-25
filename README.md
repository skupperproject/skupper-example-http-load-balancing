# Skupper HTTP load balancing

[![main](https://github.com/skupperproject/skupper-example-hello-world/actions/workflows/main.yaml/badge.svg)](https://github.com/skupperproject/skupper-example-hello-world/actions/workflows/main.yaml)

#### Deploying multiple http services for anycast access across cluster

This example is part of a [suite of examples][examples] showing the
different ways you can use [Skupper][website] to connect services
across cloud providers, data centers, and edge sites.

[website]: https://skupper.io/
[examples]: https://skupper.io/examples/index.html

#### Contents

* [Overview](#overview)
* [Prerequisites](#prerequisites)
* [Step 1: Install the Skupper command-line tool](#step-1-install-the-skupper-command-line-tool)
* [Step 2: Configure separate console sessions](#step-2-configure-separate-console-sessions)
* [Step 3: Access your clusters](#step-3-access-your-clusters)
* [Step 4: Set up your namespaces](#step-4-set-up-your-namespaces)
* [Step 5: Install Skupper in your namespaces](#step-5-install-skupper-in-your-namespaces)
* [Step 6: Check the status of your namespaces](#step-6-check-the-status-of-your-namespaces)
* [Step 7: Link your namespaces](#step-7-link-your-namespaces)
* [Step 8: Link the private clusters](#step-8-link-the-private-clusters)
* [Step 9: Deploy the HTTP service](#step-9-deploy-the-http-service)
* [Step 10: Expose the HTTP service](#step-10-expose-the-http-service)
* [Step 11: Bind the service to the deployment](#step-11-bind-the-service-to-the-deployment)
* [Step 12: Deploy the HTTP clients](#step-12-deploy-the-http-clients)
* [Step 13: Review client logs](#step-13-review-client-logs)
* [Accessing the web console](#accessing-the-web-console)
* [Cleaning up](#cleaning-up)
* [Summary](#summary)
* [About this example](#about-this-example)

## Overview

This tutorial demonstrates how to deploy a set of http servers across multiple clusters and observe anycast application routing over a Virtual Application Network.

In this tutorial, you will deploy http servers to both a public and a private cluster. You will also create http clients that will access the http servers via the same address. You will observe how the VAN supports anycast application addressing by balancing client requests across the https servers on both the public and private cluster.

## Prerequisites

* The `kubectl` command-line tool, version 1.15 or later
  ([installation guide][install-kubectl])

* Access to at least one Kubernetes cluster, from [any provider you
  choose][kube-providers]

[install-kubectl]: https://kubernetes.io/docs/tasks/tools/install-kubectl/
[kube-providers]: https://skupper.io/start/kubernetes.html

## Step 1: Install the Skupper command-line tool

The `skupper` command-line tool is the entrypoint for installing
and configuring Skupper.  You need to install the `skupper`
command only once for each development environment.

On Linux or Mac, you can use the install script (inspect it
[here][install-script]) to download and extract the command:

~~~ shell
curl https://skupper.io/install.sh | sh
~~~

The script installs the command under your home directory.  It
prompts you to add the command to your path if necessary.

For Windows and other installation options, see [Installing
Skupper][install-docs].

[install-script]: https://github.com/skupperproject/skupper-website/blob/main/docs/install.sh
[install-docs]: https://skupper.io/install/index.html

## Step 2: Configure separate console sessions

Skupper is designed for use with multiple namespaces, usually on
different clusters.  The `skupper` command uses your
[kubeconfig][kubeconfig] and current context to select the
namespace where it operates.

[kubeconfig]: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/

Your kubeconfig is stored in a file in your home directory.  The
`skupper` and `kubectl` commands use the `KUBECONFIG` environment
variable to locate it.

A single kubeconfig supports only one active context per user.
Since you will be using multiple contexts at once in this
exercise, you need to create distinct kubeconfigs.

Start a console session for each of your namespaces.  Set the
`KUBECONFIG` environment variable to a different path in each
session.

_**Console for public1:**_

~~~ shell
export KUBECONFIG=~/.kube/config-public1
~~~

_**Console for public2:**_

~~~ shell
export KUBECONFIG=~/.kube/config-public2
~~~

_**Console for private1:**_

~~~ shell
export KUBECONFIG=~/.kube/config-private1
~~~

_**Console for private2:**_

~~~ shell
export KUBECONFIG=~/.kube/config-private2
~~~

## Step 3: Access your clusters

The procedure for accessing a Kubernetes cluster varies by
provider. [Find the instructions for your chosen
provider][kube-providers] and use them to authenticate and
configure access for each console session.

[kube-providers]: https://skupper.io/start/kubernetes.html

## Step 4: Set up your namespaces

Use `kubectl create namespace` to create the namespaces you wish
to use (or use existing namespaces).  Use `kubectl config
set-context` to set the current namespace for each session.

_**Console for public1:**_

~~~ shell
kubectl create namespace public1
kubectl config set-context --current --namespace public1
~~~

_**Console for public2:**_

~~~ shell
kubectl create namespace public2
kubectl config set-context --current --namespace public2
~~~

_**Console for private1:**_

~~~ shell
kubectl create namespace private1
kubectl config set-context --current --namespace private1
~~~

_**Console for private2:**_

~~~ shell
kubectl create namespace private2
kubectl config set-context --current --namespace private2
~~~

## Step 5: Install Skupper in your namespaces

The `skupper init` command installs the Skupper router and service
controller in the current namespace.  Run the `skupper init` command
in each namespace.

**Note:** If you are using Minikube, [you need to start `minikube
tunnel`][minikube-tunnel] before you install Skupper.

[minikube-tunnel]: https://skupper.io/start/minikube.html#running-minikube-tunnel

_**Console for public1:**_

~~~ shell
skupper init --enable-console --enable-flow-collector
~~~

_**Console for public2:**_

~~~ shell
skupper init
~~~

_**Console for private1:**_

~~~ shell
skupper init
~~~

_**Console for private2:**_

~~~ shell
skupper init
~~~

_Sample output:_

~~~ console
$ skupper init
Waiting for LoadBalancer IP or hostname...
Skupper is now installed in namespace '<namespace>'.  Use 'skupper status' to get more information.
~~~

## Step 6: Check the status of your namespaces

Use `skupper status` in each console to check that Skupper is
installed.

_**Console for public1:**_

~~~ shell
skupper status
~~~

_**Console for public2:**_

~~~ shell
skupper status
~~~

_**Console for private1:**_

~~~ shell
skupper status
~~~

_**Console for private2:**_

~~~ shell
skupper status
~~~

_Sample output:_

~~~ console
Skupper is enabled for namespace "<namespace>" in interior mode. It is connected to 1 other site. It has 1 exposed service.
The site console url is: <console-url>
The credentials for internal console-auth mode are held in secret: 'skupper-console-users'
~~~

As you move through the steps below, you can use `skupper status` at
any time to check your progress.

## Step 7: Link your namespaces

Creating a link requires use of two `skupper` commands in
conjunction, `skupper token create` and `skupper link create`.

The `skupper token create` command generates a secret token that
signifies permission to create a link.  The token also carries the
link details.  Then, in a remote namespace, The `skupper link
create` command uses the token to create a link to the namespace
that generated it.

**Note:** The link token is truly a *secret*.  Anyone who has the
token can link to your namespace.  Make sure that only those you
trust have access to it.

First, use `skupper token create` in one namespace to generate the
token.  Then, use `skupper link create` in the other to create a
link.

_**Console for public1:**_

~~~ shell
skupper token create ~/secret.token
~~~

_Sample output:_

~~~ console
$ skupper token create ~/secret.token
Token written to ~/secret.token
~~~

_**Console for public2:**_

~~~ shell
skupper link create ~/secret.token
~~~

_Sample output:_

~~~ console
$ skupper link create ~/secret.token
Site configured to link to https://10.105.193.154:8081/ed9c37f6-d78a-11ec-a8c7-04421a4c5042 (name=link1)
Check the status of the link using 'skupper link status'.
~~~

If your console sessions are on different machines, you may need
to use `sftp` or a similar tool to transfer the token securely.
By default, tokens expire after a single use or 15 minutes after
creation.

## Step 8: Link the private clusters

Use `skupper token create` 
and create links

_**Console for public1:**_

~~~ shell
skupper token create /tmp/public1.yaml --uses 2
~~~

_Sample output:_

~~~ console
$ skupper token create /tmp/public1.yaml --uses 2
token created
~~~

_**Console for private1:**_

~~~ shell
skupper link create /tmp/public1.yaml
~~~

_Sample output:_

~~~ console
$ skupper link create /tmp/public1.yaml
link created
~~~

_**Console for private2:**_

~~~ shell
skupper link create /tmp/public1.yaml
~~~

_Sample output:_

~~~ console
$ skupper link create /tmp/public1.yaml
link created
~~~

## Step 9: Deploy the HTTP service

After creating the application router network, deploy the HTTP services. The **private1** and **public1** clusters will be used to deploy the HTTP servers and the **public2** and **private2** clusters will be used to enable client http communications to the servers.

_**Console for public1:**_

~~~ shell
kubectl apply -f ./server.yaml
~~~

_Sample output:_

~~~ console
$ kubectl apply -f ./server.yaml
created
~~~

_**Console for private1:**_

~~~ shell
kubectl apply -f ./server.yaml
~~~

_Sample output:_

~~~ console
$ kubectl apply -f ./server.yaml
created
~~~

## Step 10: Expose the HTTP service

Use `skupper create` to create a service.

_**Console for public1:**_

~~~ shell
skupper service create httpsvc 8080 --protocol tcp
~~~

_Sample output:_

~~~ console
$ skupper service create httpsvc 8080 --protocol tcp
service created
~~~

## Step 11: Bind the service to the deployment

Bind services to deployments

_**Console for public1:**_

~~~ shell
skupper service bind httpsvc deployment http-server
~~~

_Sample output:_

~~~ console
$ skupper service bind httpsvc deployment http-server
bind
~~~

_**Console for private1:**_

~~~ shell
skupper service bind httpsvc deployment http-server
~~~

_Sample output:_

~~~ console
$ skupper service bind httpsvc deployment http-server
bind
~~~

## Step 12: Deploy the HTTP clients

Deploy clients

_**Console for public2:**_

~~~ shell
kubectl apply -f ./client.yaml
~~~

_Sample output:_

~~~ console
$ kubectl apply -f ./client.yaml
bind
~~~

_**Console for private2:**_

~~~ shell
kubectl apply -f ./client.yaml
~~~

_Sample output:_

~~~ console
$ kubectl apply -f ./client.yaml
bind
~~~

## Step 13: Review client logs

Write client logs to /tmp

_**Console for public2:**_

~~~ shell
kubectl logs $(kubectl get pod -l application=http-client -o=jsonpath='{.items[0].metadata.name}')
~~~

_Sample output:_

~~~ console
$ kubectl logs $(kubectl get pod -l application=http-client -o=jsonpath='{.items[0].metadata.name}')
Service Name: HTTPSVC
Service Host: 10.105.108.176
Service Port: 8080
Configured concurrency: 50
Query URL: http://10.105.108.176:8080/request

======== Rates per server-pod ========
http-server-774567c64f-n2qt9: 75.5
http-server-774567c64f-qw9kw: 84.5
http-server-774567c64f-2mm88: 87
http-server-774567c64f-mxfhx: 73
~~~

_**Console for private2:**_

~~~ shell
kubectl logs $(kubectl get pod -l application=http-client -o=jsonpath='{.items[0].metadata.name}')
~~~

_Sample output:_

~~~ console
$ kubectl logs $(kubectl get pod -l application=http-client -o=jsonpath='{.items[0].metadata.name}')
Service Name: HTTPSVC
Service Host: 10.105.108.176
Service Port: 8080
Configured concurrency: 50
Query URL: http://10.105.108.176:8080/request

======== Rates per server-pod ========
http-server-774567c64f-n2qt9: 75.5
http-server-774567c64f-qw9kw: 84.5
http-server-774567c64f-2mm88: 87
http-server-774567c64f-mxfhx: 73
~~~

## Accessing the web console

Skupper includes a web console you can use to view the application
network.  To access it, use `skupper status` to look up the URL of
the web console.  Then use `kubectl get
secret/skupper-console-users` to look up the console admin
password.

**Note:** The `<console-url>` and `<password>` fields in the
following output are placeholders.  The actual values are specific
to your environment.

_**Console for public1:**_

~~~ shell
skupper status
kubectl get secret/skupper-console-users -o jsonpath={.data.admin} | base64 -d
~~~

_Sample output:_

~~~ console
$ skupper status
Skupper is enabled for namespace "public1" in interior mode. It is connected to 1 other site. It has 1 exposed service.
The site console url is: <console-url>
The credentials for internal console-auth mode are held in secret: 'skupper-console-users'

$ kubectl get secret/skupper-console-users -o jsonpath={.data.admin} | base64 -d
<password>
~~~

Navigate to `<console-url>` in your browser.  When prompted, log
in as user `admin` and enter the password.

## Cleaning up

To remove Skupper and the other resources from this exercise, use
the following commands.

_**Console for public1:**_

~~~ shell
skupper delete
kubectl delete service/frontend
kubectl delete deployment/frontend
~~~

_**Console for private1:**_

~~~ shell
skupper delete
kubectl delete deployment/backend
~~~

## Summary

This example locates the frontend and backend services in different
namespaces, on different clusters.  Ordinarily, this means that they
have no way to communicate unless they are exposed to the public
internet.

Introducing Skupper into each namespace allows us to create a virtual
application network that can connect services in different clusters.
Any service exposed on the application network is represented as a
local service in all of the linked namespaces.

The backend service is located in `east`, but the frontend service
in `west` can "see" it as if it were local.  When the frontend
sends a request to the backend, Skupper forwards the request to the
namespace where the backend is running and routes the response back to
the frontend.

<img src="images/sequence.svg" width="640"/>

## Next steps

Check out the other [examples][examples] on the Skupper website.

## About this example

This example was produced using [Skewer][skewer], a library for
documenting and testing Skupper examples.

[skewer]: https://github.com/skupperproject/skewer

Skewer provides utility functions for generating the README and
running the example steps.  Use the `./plano` command in the project
root to see what is available.

To quickly stand up the example using Minikube, try the `./plano demo`
command.
