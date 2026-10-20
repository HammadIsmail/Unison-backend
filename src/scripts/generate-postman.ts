import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const config = new DocumentBuilder()
      .setTitle('UNISON API')
      .setDescription('Alumni Network — CS Department, UET Faisalabad')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    fs.writeFileSync('./unison-postman-collection.json', JSON.stringify(document, null, 2));
    console.log('Successfully generated unison-postman-collection.json');
    
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error generating swagger JSON:', error);
    process.exit(1);
  }
}
bootstrap();
