"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = require("neo4j-driver");
let Neo4jService = class Neo4jService {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    getSession() {
        return this.driver.session();
    }
    async run(cypher, params = {}) {
        const session = this.getSession();
        try {
            return await session.run(cypher, params);
        }
        finally {
            await session.close();
        }
    }
    async onModuleDestroy() {
        await this.driver.close();
    }
};
exports.Neo4jService = Neo4jService;
exports.Neo4jService = Neo4jService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('NEO4J_DRIVER')),
    __metadata("design:paramtypes", [neo4j_driver_1.Driver])
], Neo4jService);
//# sourceMappingURL=neo4j.service.js.map