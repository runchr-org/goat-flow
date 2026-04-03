/**
 * Coverage for agent detection, stack detection, and signal-to-template routing.
 * These tests protect the heuristics that drive setup suggestions.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockFS } from '../helpers/mock-fs.js';
import { detectAgents } from '../../src/cli/detect/agents.js';
import { detectStack } from '../../src/cli/detect/project-stack.js';
import {
  mapLanguagesToTemplates,
  mapSignalsToTemplates,
} from '../../src/cli/prompt/template-refs.js';

describe('detectAgents', () => {
  it('finds Claude when CLAUDE.md exists', () => {
    const fs = createMockFS({ 'CLAUDE.md': '# CLAUDE.md' });
    const agents = detectAgents(fs);
    assert.equal(agents.length, 1);
    assert.equal(agents[0].id, 'claude');
  });

  it('finds all three agents', () => {
    const fs = createMockFS({
      'CLAUDE.md': '# Claude',
      'AGENTS.md': '# Agents',
      'GEMINI.md': '# Gemini',
    });
    const agents = detectAgents(fs);
    assert.equal(agents.length, 3);
    assert.deepEqual(
      agents.map((a) => a.id),
      ['claude', 'codex', 'gemini'],
    );
  });

  it('returns empty when no instruction files', () => {
    const fs = createMockFS({ 'README.md': '# Hello' });
    const agents = detectAgents(fs);
    assert.equal(agents.length, 0);
  });
});

describe('detectStack', () => {
  it('detects TypeScript from package.json devDeps', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        devDependencies: { typescript: '^5.0.0' },
        scripts: { build: 'tsc', test: 'vitest', lint: 'eslint .' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('typescript'));
    assert.equal(stack.buildCommand, 'tsc');
    assert.equal(stack.testCommand, 'vitest');
    assert.equal(stack.lintCommand, 'eslint .');
  });

  it('detects Rust from Cargo.toml', () => {
    const fs = createMockFS({ 'Cargo.toml': '[package]\nname = "myapp"\n' });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('rust'));
    assert.equal(stack.testCommand, 'cargo test');
  });

  it('detects Go from go.mod', () => {
    const fs = createMockFS({ 'go.mod': 'module foo\n\ngo 1.21\n' });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('go'));
    assert.equal(stack.testCommand, 'go test ./...');
  });

  it('detects markdown-only project', () => {
    const fs = createMockFS({
      'README.md': '# Hello',
      'docs/a.md': 'a',
      'docs/b.md': 'b',
      'docs/c.md': 'c',
      'docs/d.md': 'd',
      'docs/e.md': 'e',
      'docs/f.md': 'f',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('markdown'));
  });

  // --- Frontend framework detection ---

  it('detects React from package.json deps', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        dependencies: { react: '^18.0.0' },
        scripts: { test: 'vitest' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('react'));
  });

  it('detects Vue from package.json deps', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        dependencies: { vue: '^3.0.0' },
        scripts: { test: 'vitest' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('vue'));
  });

  it('detects Angular from package.json deps', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        dependencies: { '@angular/core': '^17.0.0' },
        scripts: { test: 'ng test' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('angular'));
  });

  it('detects Svelte from package.json deps', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        devDependencies: { svelte: '^4.0.0' },
        scripts: { test: 'vitest' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('svelte'));
  });

  it('detects Blade from .blade.php files', () => {
    const fs = createMockFS({
      'composer.json': JSON.stringify({
        require: { 'laravel/framework': '^11.0' },
      }),
      'resources/views/welcome.blade.php': '<h1>Hello</h1>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('blade'));
  });

  it('detects Twig from .twig files', () => {
    const fs = createMockFS({
      'composer.json': JSON.stringify({
        require: { 'symfony/framework-bundle': '^7.0' },
      }),
      'templates/base.html.twig': '{% block body %}{% endblock %}',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('twig'));
  });

  it('detects ERB from .erb files', () => {
    const fs = createMockFS({
      'app/views/users/index.html.erb': '<%= @users.each do |u| %>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('erb'));
  });

  it('detects Swift/iOS from Package.swift', () => {
    const fs = createMockFS({
      'Package.swift': '// swift-tools-version: 5.9',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('swift'));
  });

  it('detects Blazor from .razor files', () => {
    const fs = createMockFS({
      'Components/Pages/Home.razor': '<h1>Hello</h1>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('blazor'));
  });

  // --- Backend stack detection (fleshed-out detectors) ---

  it('detects Ruby from Gemfile', () => {
    const fs = createMockFS({
      Gemfile: "source 'https://rubygems.org'\ngem 'sinatra'",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('ruby'));
    assert.equal(stack.testCommand, 'bundle exec rspec');
  });

  it('detects Rails from Gemfile', () => {
    const fs = createMockFS({
      Gemfile: "source 'https://rubygems.org'\ngem 'rails', '~> 7.0'",
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('ruby'));
    assert.ok(stack.languages.includes('rails'));
  });

  it('detects Java from pom.xml', () => {
    const fs = createMockFS({
      'pom.xml': '<project><artifactId>myapp</artifactId></project>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('java'));
    assert.equal(stack.buildCommand, 'mvn package');
    assert.equal(stack.testCommand, 'mvn test');
  });

  it('detects Spring from pom.xml', () => {
    const fs = createMockFS({
      'pom.xml':
        '<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('java'));
    assert.ok(stack.languages.includes('spring'));
  });

  it('detects C# from .csproj', () => {
    const fs = createMockFS({
      'src/MyApp.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('csharp'));
    assert.equal(stack.buildCommand, 'dotnet build');
    assert.equal(stack.testCommand, 'dotnet test');
  });

  // --- Backend framework detection ---

  it('detects Laravel from composer.json', () => {
    const fs = createMockFS({
      'composer.json': JSON.stringify({
        require: { 'laravel/framework': '^11.0' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('php'));
    assert.ok(stack.languages.includes('laravel'));
  });

  it('detects Symfony from composer.json', () => {
    const fs = createMockFS({
      'composer.json': JSON.stringify({
        require: { 'symfony/framework-bundle': '^7.0' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('php'));
    assert.ok(stack.languages.includes('symfony'));
  });

  it('detects Django from requirements.txt', () => {
    const fs = createMockFS({
      'requirements.txt': 'django==5.0\npsycopg2-binary\n',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('python'));
    assert.ok(stack.languages.includes('django'));
  });

  it('detects FastAPI from pyproject.toml', () => {
    const fs = createMockFS({
      'pyproject.toml': '[project]\ndependencies = ["fastapi", "uvicorn"]\n',
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('python'));
    assert.ok(stack.languages.includes('fastapi'));
  });

  it('detects Express from package.json', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        dependencies: { express: '^4.0.0' },
        scripts: { test: 'jest' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('javascript'));
    assert.ok(stack.languages.includes('express'));
  });

  it('detects Cypress from package.json devDeps', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        devDependencies: { cypress: '^13.0.0' },
        scripts: { test: 'jest' },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(stack.languages.includes('cypress'));
  });

  // --- Signal detection ---

  it('detects Packer in deploy platforms', () => {
    const fs = createMockFS({
      'infra/web.pkr.hcl': 'source "amazon-ebs" "web" {}',
    });
    const stack = detectStack(fs);
    assert.ok(stack.signals.deployPlatforms.includes('packer'));
  });

  // --- Test command fallback detection ---

  it('detects testCommand from e2e script when no scripts.test', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        devDependencies: { cypress: '^13.0.0' },
        scripts: { e2e: 'cypress run', build: 'tsc' },
      }),
    });
    const stack = detectStack(fs);
    assert.equal(stack.testCommand, 'npm run e2e');
  });

  it('detects testCommand from test-like script name', () => {
    const fs = createMockFS({
      'package.json': JSON.stringify({
        scripts: {
          predeploy_tests_feature:
            'cypress run --spec "cypress/e2e/feature/**"',
        },
      }),
    });
    const stack = detectStack(fs);
    assert.ok(
      stack.testCommand?.includes('test'),
      `Expected test-like command, got: ${stack.testCommand}`,
    );
  });
});

describe('mapLanguagesToTemplates - frontend routing', () => {
  it('routes React to react.md', () => {
    const refs = mapLanguagesToTemplates(['javascript', 'react']);
    const frontend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.ok(frontend, 'Expected frontend.md ref');
    assert.ok(frontend.template.endsWith('/react.md'));
  });

  it('routes Vue to vue.md', () => {
    const refs = mapLanguagesToTemplates(['javascript', 'vue']);
    const frontend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.ok(frontend, 'Expected frontend.md ref');
    assert.ok(frontend.template.endsWith('/vue.md'));
  });

  it('routes Angular to angular.md', () => {
    const refs = mapLanguagesToTemplates(['javascript', 'angular']);
    const frontend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.ok(frontend, 'Expected frontend.md ref');
    assert.ok(frontend.template.endsWith('/angular.md'));
  });

  it('does not route removed template engines (blade, twig, erb, jinja, blazor, swift)', () => {
    for (const lang of ['blade', 'twig', 'erb', 'jinja', 'blazor', 'swift']) {
      const refs = mapLanguagesToTemplates([lang]);
      const frontend = refs.find(
        (r) => r.output === 'ai-docs/coding-standards/frontend.md',
      );
      assert.ok(
        !frontend,
        `${lang} should not produce a frontend template (template removed)`,
      );
    }
  });

  it('falls back to typescript.md for TS without framework', () => {
    const refs = mapLanguagesToTemplates(['javascript', 'typescript']);
    const frontend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.ok(frontend, 'Expected frontend.md ref');
    assert.ok(frontend.template.endsWith('/typescript.md'));
  });

  it('framework takes priority over TS fallback', () => {
    const refs = mapLanguagesToTemplates(['javascript', 'typescript', 'react']);
    const frontend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.ok(frontend, 'Expected frontend.md ref');
    assert.ok(
      frontend.template.endsWith('/react.md'),
      `Got ${frontend.template}`,
    );
  });

  it('first detected framework wins', () => {
    const refs = mapLanguagesToTemplates(['javascript', 'react', 'vue']);
    const frontendRefs = refs.filter(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.equal(
      frontendRefs.length,
      1,
      'Should produce exactly one frontend ref',
    );
    assert.ok(frontendRefs[0].template.endsWith('/react.md'));
  });

  it('no frontend ref for Go-only project', () => {
    const refs = mapLanguagesToTemplates(['go']);
    const frontend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/frontend.md',
    );
    assert.equal(frontend, undefined, 'Go-only should not get frontend.md');
  });
});

describe('mapLanguagesToTemplates - backend framework routing', () => {
  it('routes Laravel over generic PHP for backend.md', () => {
    const refs = mapLanguagesToTemplates(['php', 'laravel']);
    const backend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/backend.md',
    );
    assert.ok(backend, 'Expected backend.md ref');
    assert.ok(
      backend.template.endsWith('/php-laravel.md'),
      `Got ${backend.template}`,
    );
  });

  it('routes Django over generic Python for backend.md', () => {
    const refs = mapLanguagesToTemplates(['python', 'django']);
    const backend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/backend.md',
    );
    assert.ok(backend, 'Expected backend.md ref');
    assert.ok(
      backend.template.endsWith('/python-django.md'),
      `Got ${backend.template}`,
    );
  });

  it('routes generic Python when no framework detected', () => {
    const refs = mapLanguagesToTemplates(['python']);
    const backend = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/backend.md',
    );
    assert.ok(backend, 'Expected backend.md ref');
    assert.ok(
      backend.template.endsWith('/python.md'),
      `Got ${backend.template}`,
    );
  });

  it('adds security framework template for detected framework', () => {
    const refs = mapLanguagesToTemplates(['php', 'laravel']);
    const sec = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/security-laravel.md',
    );
    assert.ok(sec, 'Expected security-laravel.md ref');
    assert.ok(sec.template.includes('framework-specific/laravel.md'));
  });

  it('does not add web-common for Ruby projects (template removed)', () => {
    const refs = mapLanguagesToTemplates(['ruby']);
    const webCommon = refs.find(
      (r) => r.output === 'ai-docs/coding-standards/web-common.md',
    );
    assert.ok(
      !webCommon,
      'Ruby template removed — should not get web-common.md',
    );
  });
});

describe('mapSignalsToTemplates', () => {
  const emptySignals = {
    codeGenTools: [],
    deployPlatforms: [],
    llmIntegration: false,
    staticAnalysis: [],
    complianceSignals: false,
    formatterGaps: [],
  };

  it('always includes security.md and testing.md', () => {
    const refs = mapSignalsToTemplates(emptySignals);
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/security.md'),
      'Expected security.md',
    );
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/testing.md'),
      'Expected testing.md',
    );
  });

  it('always includes secrets-management and supply-chain', () => {
    const refs = mapSignalsToTemplates(emptySignals);
    assert.ok(
      refs.find(
        (r) => r.output === 'ai-docs/coding-standards/secrets-management.md',
      ),
    );
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/supply-chain.md'),
    );
  });

  it('adds web security templates for web languages', () => {
    const refs = mapSignalsToTemplates(emptySignals, ['typescript']);
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/api-auth.md'),
      'Expected api-auth.md',
    );
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/file-upload.md'),
      'Expected file-upload.md',
    );
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/sql-injection.md'),
      'Expected sql-injection.md',
    );
  });

  it('skips web security templates for non-web languages', () => {
    const refs = mapSignalsToTemplates(emptySignals, ['bash']);
    assert.equal(
      refs.find((r) => r.output === 'ai-docs/coding-standards/api-auth.md'),
      undefined,
    );
  });

  it('adds infrastructure-security for deploy platforms', () => {
    const refs = mapSignalsToTemplates({
      ...emptySignals,
      deployPlatforms: ['docker'],
    });
    assert.ok(
      refs.find(
        (r) => r.output === 'ai-docs/coding-standards/infrastructure-security.md',
      ),
    );
  });

  it('adds terraform template when terraform detected', () => {
    const refs = mapSignalsToTemplates({
      ...emptySignals,
      deployPlatforms: ['terraform'],
    });
    assert.ok(
      refs.find((r) => r.output === 'ai-docs/coding-standards/devops-terraform.md'),
    );
  });

  it('does not add packer template (removed)', () => {
    const refs = mapSignalsToTemplates({
      ...emptySignals,
      deployPlatforms: ['packer'],
    });
    assert.ok(
      !refs.find((r) => r.output === 'ai-docs/coding-standards/devops-packer.md'),
    );
  });
});
