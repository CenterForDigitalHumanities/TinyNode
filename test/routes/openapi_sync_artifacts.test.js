import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..", "..")
const artifactPath = path.join(repoRoot, "openapi", "components", "tinynode-shared-components.openapi.yaml")
const workflowPath = path.join(repoRoot, ".github", "workflows", "shared_openapi_sync.yaml")

describe("Shared OpenAPI artifact sync scaffolding.", () => {
  it("the canonical shared artifact has valid OpenAPI structure.  __exists __core", () => {
    const artifact = fs.readFileSync(artifactPath, "utf8")
    assert.match(artifact, /^openapi: 3\.\d+\.\d+/m, "artifact must declare an openapi 3.x version")
    assert.match(artifact, /^\s+title: \S/m, "artifact info.title must be present and non-empty")
    assert.match(artifact, /^\s+version: \d+\.\d+\.\d+/m, "artifact info.version must be a semver-style string")
    assert.match(artifact, /^components:/m, "artifact must define a top-level components section")
    assert.match(artifact, /^\s+schemas:/m, "artifact must define components.schemas")
  })

  it("the sync workflow targets the correct receiver repo and paths.  __exists __core", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8")
    assert.match(workflow, /repository:\s*cubap\/rerum_openapi/, "workflow must check out cubap/rerum_openapi as the receiver")
    assert.match(workflow, /openapi\/components\/tinynode-shared-components\.openapi\.yaml/, "workflow must reference the canonical source path")
    assert.match(workflow, /schemas\/openapi\/tinynode-shared-components\.openapi\.yaml/, "workflow must reference the receiver target path")
    assert.match(
      workflow,
      /cp\s+openapi\/components\/tinynode-shared-components\.openapi\.yaml\s+\S*schemas\/openapi\/tinynode-shared-components\.openapi\.yaml/,
      "workflow's cp command must copy from the canonical source to the receiver target — a retargeted copy would silently corrupt the receiver"
    )
  })

  it("the sync workflow uses the expected action version and org secret.  __exists __core", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8")
    assert.match(workflow, /peter-evans\/create-pull-request@v\d+/, "workflow must use a pinned major version of peter-evans/create-pull-request")
    assert.match(
      workflow,
      /secrets\.OPENAPI(?!\w)/,
      "workflow must read the org-level secret named OPENAPI — a rename here breaks the sync silently at the receiver checkout step"
    )
  })
})
