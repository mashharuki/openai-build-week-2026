import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
}

test("PawLensのワークスペースは3つの実行可能なパッケージを公開する", () => {
  const workspace = readFileSync(resolve(root, "pnpm-workspace.yaml"), "utf8");
  const rootPackage = readJson("package.json");

  assert.match(workspace, /pkgs\/\*/);

  for (const packageName of ["mcpserver", "shared", "widget"]) {
    const packagePath = `pkgs/${packageName}/package.json`;
    assert.equal(
      existsSync(resolve(root, packagePath)),
      true,
      `${packagePath} must exist`,
    );
    const packageManifest = readJson(packagePath);

    for (const command of ["build", "test", "typecheck"]) {
      assert.equal(
        typeof packageManifest.scripts?.[command],
        "string",
        `${packageName} must define ${command}`,
      );
    }
  }

  for (const command of ["build", "test", "typecheck", "lint"]) {
    assert.equal(
      typeof rootPackage.scripts?.[command],
      "string",
      `root must define ${command}`,
    );
  }
});

test("MCP WorkerはローカルKVとウィジェット静的アセットを設定する", () => {
  const wranglerPath = resolve(root, "pkgs/mcpserver/wrangler.toml");
  assert.equal(existsSync(wranglerPath), true, "wrangler.toml must exist");

  const wrangler = readFileSync(wranglerPath, "utf8");
  assert.match(wrangler, /compatibility_date\s*=\s*"2026-07-16"/);
  assert.match(wrangler, /binding\s*=\s*"PAWLENS_KV"/);
  assert.match(wrangler, /id\s*=\s*"[0-9a-f]{32}"/);
  assert.match(wrangler, /preview_id\s*=\s*"[0-9a-f]{32}"/);
  assert.match(wrangler, /directory\s*=\s*"\.\.\/widget\/dist"/);
});
