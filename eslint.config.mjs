import globals from 'globals';


export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    rules: {
      "no-unused-vars": "warn",
    }
  },
  {
    languageOptions: { globals: globals.browser }
  },
  // pluginJs.configs.recommended,
  // ...tseslint.configs.recommended,
];