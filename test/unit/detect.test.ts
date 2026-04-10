/**
 * Coverage for agent detection, stack detection, and signal-to-template routing.
 * These tests protect the heuristics that drive setup suggestions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockFS } from "../helpers/mock-fs.js";
import { detectAgents } from "../../src/cli/detect/agents.js";
import { detectStack } from "../../src/cli/detect/project-stack.js";
import {
  mapLanguagesToTemplates,
  mapSignalsToTemplates,
} from "../../src/cli/prompt/template-refs.js";

describe("detectAgents", () => {
  it("finds Claude when CLAUDE.md exists", () => {
    const fs = createMockFS({ "CLAUDE.md": "# CLAUDE.md" });
    const agents = detectAgents(fs);
    assert.equal(agents.length, 1);
    assert.equal(agents[0].id, "claude");
  });

  it("finds all three agents", () => {
    const fs = createMockFS({
      "CLAUDE.md": "# Claude",
      "AGENTS.md": "# Agents",
      "GEMINI.md": "# Gemini",
    });
    const agents = detectAgents(fs);
    assert.equal(agents.length, 3);
    assert.deepEqual(
      agents.map((a) => a.id),
      ["claude", "codex", "gemini"],
    );
  });

  it("returns empty when no instruction files", () => {
    const fs = createMockFS({ "README.md": "# Hello" });
    const agents = detectAgents(fs);
    assert.equal(agents.length, 0);
  });
});

describe("detectStack", () => {
  it("detects TypeScript from package.json devDeps", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        devDependencies: { typescript: "^5.0.0" },
        scripts: { build: "tsc", test: "vitest", lint: "eslint ." },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("typescript"));
    assert.equal(stack.buildCommand, "tsc");
    assert.equal(stack.testCommand, "vitest");
    assert.equal(stack.lintCommand, "eslint .");
  });

  it("detects Rust from Cargo.toml", () => {
    const fs = createMockFS({ "Cargo.toml": '[package]\nname = "myapp"\n' });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("rust"));
    assert.equal(stack.testCommand, "cargo test");
  });

  it("detects Go from go.mod", () => {
    const fs = createMockFS({ "go.mod": "module foo\n\ngo 1.21\n" });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("go"));
    assert.equal(stack.testCommand, "go test ./...");
  });

  it("detects markdown-only project", () => {
    const fs = createMockFS({
      "README.md": "# Hello",
      "docs/a.md": "a",
      "docs/b.md": "b",
      "docs/c.md": "c",
      "docs/d.md": "d",
      "docs/e.md": "e",
      "docs/f.md": "f",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("markdown"));
  });

  // --- Frontend framework detection ---

  it("detects React from package.json deps", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        dependencies: { react: "^18.0.0" },
        scripts: { test: "vitest" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("react"));
  });

  it("detects Vue from package.json deps", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        dependencies: { vue: "^3.0.0" },
        scripts: { test: "vitest" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("vue"));
  });

  it("detects Angular from package.json deps", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        dependencies: { "@angular/core": "^17.0.0" },
        scripts: { test: "ng test" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("angular"));
  });

  it("detects Svelte from package.json deps", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        devDependencies: { svelte: "^4.0.0" },
        scripts: { test: "vitest" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("svelte"));
  });

  it("detects Blade from .blade.php files", () => {
    const fs = createMockFS({
      "composer.json": JSON.stringify({
        require: { "laravel/framework": "^11.0" },
      }),
      "resources/views/welcome.blade.php": "<h1>Hello</h1>",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("blade"));
  });

  it("detects Twig from .twig files", () => {
    const fs = createMockFS({
      "composer.json": JSON.stringify({
        require: { "symfony/framework-bundle": "^7.0" },
      }),
      "templates/base.html.twig": "{% block body %}{% endblock %}",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("twig"));
  });

  it("detects ERB from .erb files", () => {
    const fs = createMockFS({
      "app/views/users/index.html.erb": "<%= @users.each do |u| %>",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("erb"));
  });

  it("detects Swift/iOS from Package.swift", () => {
    const fs = createMockFS({
      "Package.swift": "// swift-tools-version: 5.9",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("swift"));
  });

  it("detects Blazor from .razor files", () => {
    const fs = createMockFS({
      "Components/Pages/Home.razor": "<h1>Hello</h1>",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("blazor"));
  });

  // --- Backend stack detection (fleshed-out detectors) ---

  it("detects Ruby from Gemfile", () => {
    const fs = createMockFS({
      Gemfile: "source 'https://rubygems.org'\ngem 'sinatra'",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("ruby"));
    assert.equal(stack.testCommand, "bundle exec rspec");
  });

  it("detects Rails from Gemfile", () => {
    const fs = createMockFS({
      Gemfile: "source 'https://rubygems.org'\ngem 'rails', '~> 7.0'",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("ruby"));
    assert.ok(stack.languages.includes("rails"));
  });

  it("detects Java from pom.xml", () => {
    const fs = createMockFS({
      "pom.xml": "<project><artifactId>myapp</artifactId></project>",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("java"));
    assert.equal(stack.buildCommand, "mvn package");
    assert.equal(stack.testCommand, "mvn test");
  });

  it("detects Spring from pom.xml", () => {
    const fs = createMockFS({
      "pom.xml":
        "<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("java"));
    assert.ok(stack.languages.includes("spring"));
  });

  it("detects C# from .csproj", () => {
    const fs = createMockFS({
      "src/MyApp.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("csharp"));
    assert.equal(stack.buildCommand, "dotnet build");
    assert.equal(stack.testCommand, "dotnet test");
  });

  // --- Backend framework detection ---

  it("detects Laravel from composer.json", () => {
    const fs = createMockFS({
      "composer.json": JSON.stringify({
        require: { "laravel/framework": "^11.0" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("php"));
    assert.ok(stack.languages.includes("laravel"));
  });

  it("detects Symfony from composer.json", () => {
    const fs = createMockFS({
      "composer.json": JSON.stringify({
        require: { "symfony/framework-bundle": "^7.0" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("php"));
    assert.ok(stack.languages.includes("symfony"));
  });

  it("detects Django from requirements.txt", () => {
    const fs = createMockFS({
      "requirements.txt": "django==5.0\npsycopg2-binary\n",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("python"));
    assert.ok(stack.languages.includes("django"));
  });

  it("detects FastAPI from pyproject.toml", () => {
    const fs = createMockFS({
      "pyproject.toml": '[project]\ndependencies = ["fastapi", "uvicorn"]\n',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("python"));
    assert.ok(stack.languages.includes("fastapi"));
  });

  it("detects Express from package.json", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        dependencies: { express: "^4.0.0" },
        scripts: { test: "jest" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("javascript"));
    assert.ok(stack.languages.includes("express"));
  });

  it("detects Cypress from package.json devDeps", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        devDependencies: { cypress: "^13.0.0" },
        scripts: { test: "jest" },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes("cypress"));
  });

  // --- Signal detection ---

  it("detects Packer in deploy platforms", () => {
    const fs = createMockFS({
      "infra/web.pkr.hcl": 'source "amazon-ebs" "web" {}',
    });
    const stack = detectStack(fs);
    assert.ok(stack.signals.deployPlatforms.includes("packer"));
  });

  // --- Test command fallback detection ---

  it("detects testCommand from e2e script when no scripts.test", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        devDependencies: { cypress: "^13.0.0" },
        scripts: { e2e: "cypress run", build: "tsc" },
      }),
    });
    const stack = detectStack(fs);
    assert.equal(stack.testCommand, "npm run e2e");
  });

  it("detects testCommand from test-like script name", () => {
    const fs = createMockFS({
      "package.json": JSON.stringify({
        scripts: {
          predeploy_tests_feature:
            'cypress run --spec "cypress/e2e/feature/**"',
        },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(
      stack.testCommand?.includes("test"),
      `Expected test-like command, got: ${stack.testCommand}`,
    );
  });
});

describe("mapLanguagesToTemplates", () => {
  it("returns no setup-owned local-instruction refs for frontend stacks", () => {
    const refs = mapLanguagesToTemplates(["javascript", "react"]);
    assert.equal(refs.length, 0);
  });

  it("returns no setup-owned local-instruction refs for backend stacks", () => {
    const refs = mapLanguagesToTemplates(["python", "django"]);
    assert.equal(refs.length, 0);
  });
});

describe("mapSignalsToTemplates", () => {
  const emptySignals = {
    codeGenTools: [],
    deployPlatforms: [],
    llmIntegration: false,
    staticAnalysis: [],
    complianceSignals: false,
    formatterGaps: [],
  };

  it("returns no setup-owned signal refs", () => {
    const refs = mapSignalsToTemplates(emptySignals);
    assert.equal(refs.length, 0);
  });

  it("stays empty even when languages and deploy signals are present", () => {
    const refs = mapSignalsToTemplates(
      {
        ...emptySignals,
        deployPlatforms: ["terraform"],
        llmIntegration: true,
      },
      ["typescript"],
    );
    assert.equal(refs.length, 0);
  });
});
