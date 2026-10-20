"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        root: './',
        environment: 'node',
        include: ['test/**/*.e2e-spec.ts'],
    },
});
//# sourceMappingURL=vitest.config.e2e.js.map