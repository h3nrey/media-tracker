"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    const port = configService.get('PORT') || 3000;
    const env = configService.get('NODE_ENV') || 'development';
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Current Environment: ${env}`);
}
bootstrap();
//# sourceMappingURL=main.js.map