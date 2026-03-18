"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const neo4j_module_1 = require("./neo4j/neo4j.module");
const mail_module_1 = require("./common/mail/mail.module");
const auth_module_1 = require("./auth/auth.module");
const admin_module_1 = require("./admin/admin.module");
const alumni_module_1 = require("./alumni/alumni.module");
const student_module_1 = require("./student/student.module");
const opportunity_module_1 = require("./opportunity/opportunity.module");
const search_module_1 = require("./search/search.module");
const skill_module_1 = require("./skill/skill.module");
const network_module_1 = require("./network/network.module");
const notification_module_1 = require("./notification/notification.module");
const cloudinary_module_1 = require("./cloudinary/cloudinary.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            neo4j_module_1.Neo4jModule,
            mail_module_1.MailModule,
            auth_module_1.AuthModule,
            admin_module_1.AdminModule,
            alumni_module_1.AlumniModule,
            student_module_1.StudentModule,
            opportunity_module_1.OpportunityModule,
            search_module_1.SearchModule,
            skill_module_1.SkillModule,
            network_module_1.NetworkModule,
            notification_module_1.NotificationModule,
            cloudinary_module_1.CloudinaryModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map