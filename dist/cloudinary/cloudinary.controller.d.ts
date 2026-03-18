import { CloudinaryService } from './cloudinary.service';
export declare class CloudinaryController {
    private readonly cloudinaryService;
    constructor(cloudinaryService: CloudinaryService);
    uploadImage(image: Express.Multer.File): Promise<{
        url: any;
        public_id: any;
        format: any;
        width: any;
        height: any;
    }>;
}
