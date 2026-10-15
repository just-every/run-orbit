import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export function discoverTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? discoverTests(file) : /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

// Count registered cases, including each loop expansion and nested node:test case.
// Fail on an unrecognised generator so future parameterisation cannot evade the cap.
export function testInventory() {
  return ['tests', 'newtests'].flatMap(discoverTests).map(file => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const arrays = new Map();
    function arrayLength(node) {
      if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return arrayLength(node.expression);
      if (ts.isArrayLiteralExpression(node)) {
        if (node.elements.some(ts.isSpreadElement)) throw Error(`Uncounted spread test generator: ${file}`);
        return node.elements.length;
      }
      if (ts.isIdentifier(node) && arrays.has(node.text)) return arrayLength(arrays.get(node.text));
      throw Error(`Uncounted test generator in ${file}: ${node.getText(source)}`);
    }
    function declarations(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) arrays.set(node.name.text, node.initializer);
      ts.forEachChild(node, declarations);
    }
    declarations(source);
    let cases = 0;
    function visit(node) {
      if (ts.isCallExpression(node) && /^(?:(?:test|it)(?:\.(?:only|skip|todo))?|contract|t\.test)$/.test(node.expression.getText(source))) {
        let multiplicity = 1;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isForOfStatement(parent)) multiplicity *= arrayLength(parent.expression);
          if (ts.isForStatement(parent) || ts.isForInStatement(parent) || ts.isCallExpression(parent) && /\.(?:forEach|map|flatMap)$/.test(parent.expression.getText(source))) throw Error(`Uncounted test generator: ${file}`);
        }
        cases += multiplicity;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (!cases) throw Error(`Test file registers no known cases: ${file}`);
    return { file, cases };
  });
}

export function checkTestBudget() {
  const files = testInventory(), cases = files.reduce((sum, row) => sum + row.cases, 0);
  // The emitted-worker and explicit full-capacity programs are also test flows.
  const qualifications = 2;
  if (cases + qualifications > 200) throw Error(`Test budget exceeded: ${cases} registered cases + ${qualifications} qualification flows > 200`);
  return { cases, qualifications, total: cases + qualifications, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inventory = testInventory(), cases = inventory.reduce((sum, row) => sum + row.cases, 0);
  console.log(JSON.stringify({ cases, qualifications: 2, total: cases + 2, files: inventory }, null, 2));
}
