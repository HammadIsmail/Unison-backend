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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const search_service_1 = require("./search.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let SearchController = class SearchController {
    searchService;
    constructor(searchService) {
        this.searchService = searchService;
    }
    searchAlumni(name, company, skill, batch_year, degree) {
        return this.searchService.searchAlumni(name, company, skill, batch_year, degree);
    }
    searchOpportunities(title, type, skill, location, is_remote) {
        return this.searchService.searchOpportunities(title, type, skill, location, is_remote);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)('alumni'),
    __param(0, (0, common_1.Query)('name')),
    __param(1, (0, common_1.Query)('company')),
    __param(2, (0, common_1.Query)('skill')),
    __param(3, (0, common_1.Query)('batch_year')),
    __param(4, (0, common_1.Query)('degree')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "searchAlumni", null);
__decorate([
    (0, common_1.Get)('opportunities'),
    __param(0, (0, common_1.Query)('title')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('skill')),
    __param(3, (0, common_1.Query)('location')),
    __param(4, (0, common_1.Query)('is_remote')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "searchOpportunities", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)('search'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map