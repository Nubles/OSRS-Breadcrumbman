import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const outDir = resolve(root, ".engine-test-build");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));

const config = {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    lib: ["es2020", "dom"],
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmitOnError: true,
    outDir
  },
  include: ["src/data.ts", "src/engine.ts", "src/types.ts", "src/engine.test.ts"]
};

const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const emit = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emit.diagnostics);

if (diagnostics.length) {
  const host = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => "\n"
  };
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  process.exit(1);
}

const require = createRequire(import.meta.url);
require(resolve(outDir, "engine.test.js"));
