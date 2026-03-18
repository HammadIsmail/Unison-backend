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
async function checkData() {
    const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || '', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USERNAME || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();
    try {
        console.log('--- Checking Approved Students ---');
        const result = await session.run("MATCH (u:User {role: 'student', account_status: 'approved'}) RETURN u.id, u.name, u.email LIMIT 10");
        if (result.records.length === 0) {
            console.log('No approved students found.');
            console.log('\n--- Checking ALL Students (Any Status) ---');
            const allStudents = await session.run("MATCH (u:User {role: 'student'}) RETURN u.id, u.name, u.account_status LIMIT 10");
            allStudents.records.forEach(r => {
                console.log(`ID: ${r.get('u.id')}, Name: ${r.get('u.name')}, Status: ${r.get('u.account_status')}`);
            });
        }
        else {
            console.log(`Found ${result.records.length} approved students:`);
            result.records.forEach(r => {
                console.log(`ID: ${r.get('u.id')}, Name: ${r.get('u.name')}, Email: ${r.get('u.email')}`);
            });
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await session.close();
        await driver.close();
    }
}
checkData();
//# sourceMappingURL=check_student_data.js.map