import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { GENERAL_FILE_EXTENSIONS, FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @Permissions('run_imports')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Number.parseInt(String(page || '1'), 10);
    const parsedLimit = Number.parseInt(String(limit || '20'), 10);
    return this.filesService.listGeneralFiles(parsedPage, parsedLimit);
  }

  private static readonly uploadOptions = {
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const originalName = String(file?.originalname || '').toLowerCase();
      const hasAllowedExtension = GENERAL_FILE_EXTENSIONS.some((extension) =>
        originalName.endsWith(extension),
      );

      if (!hasAllowedExtension) {
        cb(
          new BadRequestException(
            `Unsupported file type. Allowed extensions: ${GENERAL_FILE_EXTENSIONS.join(', ')}`,
          ) as unknown as Error,
          false,
        );
        return;
      }

      cb(null, true);
    },
    limits: {
      fileSize: 15 * 1024 * 1024,
    },
  };

  @Post('upload')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', FilesController.uploadOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.filesService.uploadGeneralFile(file, user?.userId);
  }
}
