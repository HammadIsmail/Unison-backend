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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function checkUser(id) {
    const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI, neo4j_driver_1.default.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
    const session = driver.session();
    try {
        const result = await session.run('MATCH (u:User {id: $id}) RETURN u', { id });
        if (result.records.length === 0) {
            console.log(`RESULT: User with ID ${id} NOT found`);
            const allUsers = await session.run('MATCH (u:User) RETURN u.id as id, u.email as email, u.role as role LIMIT 10');
            console.log('Existing users in DB (first 10):');
            allUsers.records.forEach(r => {
                console.log(`ID: ${r.get('id')}, Email: ${r.get('email')}, Role: ${r.get('role')}`);
            });
        }
        else {
            const user = result.records[0].get('u').properties;
            console.log('RESULT: User found');
            console.log('ID:', user.id);
            console.log('EMAIL:', user.email);
            console.log('ROLE:', user.role);
            console.log('STATUS:', user.account_status);
        }
    }
    catch (error) {
        console.error('Error connecting to Neo4j:', error);
    }
    finally {
        await session.close();
        await driver.close();
    }
}
const targetId = process.argv[2] || '076f1c3a-741c-4e62-b918-e3122d052ff1';
checkUser(targetId);
//# sourceMappingURL=identify_user.js.map