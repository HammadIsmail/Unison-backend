"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillModule = void 0;
const common_1 = require("@nestjs/common");
const skill_controller_1 = require("./skill.controller");
const skill_service_1 = require("./skill.service");
const neo4j_module_1 = require("../neo4j/neo4j.module");
let SkillModule = class SkillModule {
};
exports.SkillModule = SkillModule;
exports.SkillModule = SkillModule = __decorate([
    (0, common_1.Module)({
        imports: [neo4j_module_1.Neo4jModule],
        controllers: [skill_controller_1.SkillController],
        providers: [skill_service_1.SkillService]
    })
], SkillModule);
//# sourceMappingURL=skill.module.js.map