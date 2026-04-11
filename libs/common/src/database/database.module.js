"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const knex_1 = require("knex");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: 'KNEX_CONNECTION',
                useFactory: () => {
                    const url = process.env.DATABASE_URL;
                    if (!url) {
                        console.error('DATABASE_URL is missing!');
                    }
                    return (0, knex_1.knex)({
                        client: 'pg',
                        connection: url,
                    });
                },
            },
        ],
        exports: ['KNEX_CONNECTION'],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map