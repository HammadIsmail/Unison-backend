"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityModule = void 0;
const common_1 = require("@nestjs/common");
const opportunity_controller_1 = require("./opportunity.controller");
const opportunity_service_1 = require("./opportunity.service");
const neo4j_module_1 = require("../neo4j/neo4j.module");
let OpportunityModule = class OpportunityModule {
};
exports.OpportunityModule = OpportunityModule;
exports.OpportunityModule = OpportunityModule = __decorate([
    (0, common_1.Module)({
        imports: [neo4j_module_1.Neo4jModule],
        controllers: [opportunity_controller_1.OpportunityController],
        providers: [opportunity_service_1.OpportunityService]
    })
], OpportunityModule);
//# sourceMappingURL=opportunity.module.js.map