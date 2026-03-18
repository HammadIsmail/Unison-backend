"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function seed() {
    const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI, neo4j_driver_1.default.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
    const session = driver.session();
    const adminEmail = 'admin@uet.edu.pk';
    const adminPassword = 'Admin@1234';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await session.run(`MERGE (u:User {email: $email})
     ON CREATE SET
       u.id = $id,
       u.name = 'UNISON Admin',
       u.email = $email,
       u.password = $password,
       u.role = 'admin',
       u.account_status = 'approved',
       u.created_at = datetime()`, { id: (0, uuid_1.v4)(), email: adminEmail, password: hashedPassword });
    console.log(`✅ Admin user seeded: ${adminEmail} / Admin@1234`);
    console.log('⚠️  Please change the admin password after first login!');
    await session.close();
    await driver.close();
}
seed().catch(console.error);
//# sourceMappingURL=admin.seed.js.map