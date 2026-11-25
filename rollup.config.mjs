import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

/** Plugin source folder → generated .sdPlugin directory. */
export const PLUGINS = {
	learning: "com.windowstoolkit.learning.sdPlugin",
};

const watching = !!process.env.ROLLUP_WATCH;
const configs = [];
for (const [name, sd] of Object.entries(PLUGINS)) {
	const dir = `plugins/${name}/${sd}`;
	configs.push({
		input: `plugins/${name}/src/plugin.ts`,
		output: { file: `${dir}/bin/plugin.js`, format: "es", sourcemap: watching },
		plugins: [
			typescript({ tsconfig: "tsconfig.json", outDir: `${dir}/bin`, sourceMap: watching, inlineSources: watching }),
			nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
			commonjs(),
			!watching && terser(),
			{
				name: "emit-module-package-file",
				generateBundle() {
					this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
				},
			},
		],
	});
	// The shared settings panel: the design system's icons, then this plugin's own glyphs and key catalogue.
	configs.push({
		input: "shared/icons.js",
		output: { file: `${dir}/ui/icons.js`, format: "iife", name: "WinToolkitIcons" },
		plugins: [!watching && terser()],
	});
	configs.push({
		input: `plugins/${name}/ui-entry.js`,
		output: { file: `${dir}/ui/features.js`, format: "iife" },
		plugins: [!watching && terser()],
	});
}
export default configs;
