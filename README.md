# Tax Calculator — Cloud Native, DevOps, Agile & NoSQL Final Project (Part B/C)

A Node.js/Express Tax Calculator, containerized, tested, and deployed to
IBM Cloud Code Engine through a Tekton pipeline.

## Project layout

```
tax-calculator/
├── src/
│   ├── taxCalculator.js     # tax logic, loads brackets from config/
│   └── server.js            # Express API: POST /calculate, GET /health
├── config/
│   └── taxBrackets.json     # externalized tax bracket config (Objective 4)
├── test/
│   └── taxCalculator.test.js
├── pipeline/
│   └── tekton/
│       ├── pipeline.yaml            # Pipeline: fetch -> test -> build -> deploy
│       ├── pipelinerun.yaml         # PipelineRun to trigger it
│       ├── secret-template.yaml     # IBM Cloud API key secret template
│       └── tasks/                   # individual Task definitions
├── Dockerfile
├── .dockerignore
└── package.json
```

## Objective 1 — Containerize the application

```bash
docker build -t tax-calculator .
docker run -p 3000:3000 tax-calculator
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"income": 50000, "status": "single"}'
```

## Objective 2 — Run unit tests as part of the pipeline

`pipeline/tekton/tasks/run-unit-tests-task.yaml` runs `npm ci && npm test`
inside the pipeline. Locally:

```bash
npm install
npm test
```

## Objective 3 — Deploy only when all tests pass

In `pipeline.yaml`, `build-and-push` has `runAfter: [run-unit-tests]` and
`deploy-code-engine` has `runAfter: [build-and-push]`. Tekton stops the
whole pipeline the instant any task fails — so a single failing Jest test
means the image is never built and the app is never deployed. Nothing
extra to configure; it's enforced by the task graph itself.

### One-time cluster setup

```bash
# Install Tekton Pipelines on your cluster/OpenShift project if not already present
oc apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Register the tasks and pipeline
oc apply -f pipeline/tekton/tasks/
oc apply -f pipeline/tekton/pipeline.yaml

# Create the IBM Cloud API key secret (do NOT commit your real key)
oc create secret generic ibmcloud-api-key --from-literal=apikey='<your-ibm-cloud-api-key>'
```

### Trigger the first deployment

Edit the placeholder values in `pipeline/tekton/pipelinerun.yaml`
(`repo-url`, `image`, `ce-project`), then:

```bash
oc apply -f pipeline/tekton/pipelinerun.yaml
oc get pipelinerun -w      # watch it progress through fetch -> test -> build -> deploy
```

## Objective 4 — Replace the hard-coded configuration (tax brackets)

Already done in this codebase: `src/taxCalculator.js` no longer contains
a hard-coded bracket table. It reads `config/taxBrackets.json` at
startup (path overridable via `TAX_CONFIG_PATH`). See the
`externalized config` tests in `test/taxCalculator.test.js`, which prove
the app picks up a completely different bracket table from an external
file with zero code changes.

To change tax rates for a new year, you only ever edit
`config/taxBrackets.json` — never `taxCalculator.js`.

## Objective 5 — Deploy again when all tests pass

Because the pipeline always builds from whatever's currently committed,
redeploying after a config change is just: commit, push, re-run.

```bash
# 1. Edit config/taxBrackets.json with new values
git add config/taxBrackets.json
git commit -m "Update tax brackets for new tax year"
git push

# 2. Re-trigger the same pipeline (Tekton creates a fresh PipelineRun
#    each time from the generateName in pipelinerun.yaml)
oc apply -f pipeline/tekton/pipelinerun.yaml
oc get pipelinerun -w
```

If `npm test` fails for any reason at this point, the pipeline stops
before build/deploy — the previous, still-passing deployment stays live
and untouched.
