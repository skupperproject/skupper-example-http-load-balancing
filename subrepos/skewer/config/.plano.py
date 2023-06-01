#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#

from skewer import *

@command
def generate():
    """
    Generate README.md from the data in skewer.yaml
    """
    generate_readme("skewer.yaml", "README.md")

render_template = """
<html>
  <head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css"
          integrity="sha512-KUoB3bZ1XRBYj1QcH4BHCQjurAZnCO3WdrswyLDtp7BMwCw7dPZngSLqILf68SGgvnWHTD5pPaYrXi6wiRJ65g=="
          crossorigin="anonymous" referrerpolicy="no-referrer"/>
    <style>
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }

        @media (max-width: 767px) {
           .markdown-body {
               padding: 15px;
           }
        }
    </style>
  </head>
  <body>
    <article class="markdown-body">

@content@

    </article>
  </body>
</html>
""".strip()

@command
def render():
    """
    Render README.html from the data in skewer.yaml
    """
    generate()

    markdown = read("README.md")
    data = {"text": markdown}
    json = emit_json(data)
    content = http_post("https://api.github.com/markdown", json, content_type="application/json")
    html = render_template.replace("@content@", content)

    write("README.html", html)

    print(f"file:{get_real_path('README.html')}")

@command
def clean():
    remove(find(".", "__pycache__"))
    remove("README.html")

@command
def run_(debug=False):
    """
    Run the example steps using Minikube
    """
    run_steps_minikube("skewer.yaml", debug=debug)

@command
def run_external(*kubeconfigs, debug=False):
    """
    Run the example steps with user-provided kubeconfigs
    """
    run_steps("skewer.yaml", *kubeconfigs, debug=debug)

@command
def demo(debug=False):
    """
    Run the example steps and pause before cleaning up
    """
    with working_env(SKEWER_DEMO=1):
        run_steps_minikube("skewer.yaml", debug=debug)

@command
def test_(debug=False):
    """
    Test README generation and run the steps on Minikube
    """
    generate_readme("skewer.yaml", make_temp_file())
    run_steps_minikube("skewer.yaml", debug=debug)

@command
def update_workflow():
    """
    Update the GitHub Actions workflow file
    """

    from_file = join("subrepos", "skewer", "config", ".github", "workflows", "main.yaml")
    to_file = join(".github", "workflows", "main.yaml")

    copy(from_file, to_file)
