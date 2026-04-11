import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { ImportsHistoryQuery } from './imports.service';

@Controller('imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  private static readonly uploadOptions = {
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const allowedExtensions = ['.csv', '.tsv', '.txt', '.json', '.xlsx', '.xls', '.xlsm', '.xlsb', '.ods'];
      const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'text/tab-separated-values',
        'text/plain',
        'application/json',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroenabled.12',
        'application/vnd.ms-excel.sheet.binary.macroenabled.12',
        'application/vnd.oasis.opendocument.spreadsheet',
      ];
      const genericMimeTypes = ['application/octet-stream', 'binary/octet-stream'];
      const extensionMimeMap: Record<string, string[]> = {
        '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'],
        '.tsv': ['text/tab-separated-values', 'text/plain'],
        '.txt': ['text/plain'],
        '.json': ['application/json', 'text/json'],
        '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        '.xls': ['application/vnd.ms-excel'],
        '.xlsm': ['application/vnd.ms-excel.sheet.macroenabled.12'],
        '.xlsb': ['application/vnd.ms-excel.sheet.binary.macroenabled.12'],
        '.ods': ['application/vnd.oasis.opendocument.spreadsheet'],
      };
      const originalName = String(file?.originalname || '').toLowerCase();
      const normalizedMime = String(file?.mimetype || '').toLowerCase();
      const matchedExtension = allowedExtensions.find((ext) => originalName.endsWith(ext));
      const hasAllowedExtension = Boolean(matchedExtension);
      const hasAllowedMime =
        !normalizedMime ||
        allowedMimeTypes.includes(normalizedMime) ||
        genericMimeTypes.includes(normalizedMime);

      if (!hasAllowedExtension) {
        cb(
          new BadRequestException(
            'Only tabular file extensions are allowed (csv, tsv, txt, json, xlsx, xls, xlsm, xlsb, ods)',
          ) as unknown as Error,
          false,
        );
        return;
      }

      if (!hasAllowedMime) {
        cb(
          new BadRequestException('Uploaded file MIME type is not supported for tabular imports') as unknown as Error,
          false,
        );
        return;
      }

      if (normalizedMime && !genericMimeTypes.includes(normalizedMime) && matchedExtension) {
        const allowedMimesForExtension = extensionMimeMap[matchedExtension] || [];
        if (!allowedMimesForExtension.includes(normalizedMime)) {
          cb(
            new BadRequestException(
              `MIME type ${normalizedMime} is not compatible with ${matchedExtension} files`,
            ) as unknown as Error,
            false,
          );
          return;
        }
      }

      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  };

  @Get('history')
  @Permissions('view_imports')
  history(@Query() query: ImportsHistoryQuery) {
    return this.importsService.history(query);
  }

  @Get('stats')
  @Permissions('view_imports')
  stats() {
    return this.importsService.stats();
  }

  @Get('jobs/:jobId')
  @Permissions('view_imports')
  details(@Param('jobId') jobId: string) {
    return this.importsService.details(jobId);
  }

  @Get('templates/employees')
  @Permissions('view_imports')
  employeesTemplate(@Res() res: Response) {
    const content = this.importsService.getEmployeesTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="employees-template.csv"');
    res.status(200).send(content);
  }

  @Get('templates/products')
  @Permissions('view_imports')
  productsTemplate(@Res() res: Response) {
    const content = this.importsService.getProductsTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
    res.status(200).send(content);
  }

  @Post('employees')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', ImportsController.uploadOptions))
  importEmployees(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.importEmployees(file, user?.userId);
  }

  @Post('employees/async')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', ImportsController.uploadOptions))
  importEmployeesAsync(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.importEmployeesAsync(file, user?.userId);
  }

  @Post('employees/validate')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', ImportsController.uploadOptions))
  validateEmployees(@UploadedFile() file: Express.Multer.File) {
    return this.importsService.validateEmployeesImport(file);
  }

  @Post('products')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', ImportsController.uploadOptions))
  importProducts(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.importProducts(file, user?.userId);
  }

  @Post('products/async')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', ImportsController.uploadOptions))
  importProductsAsync(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.importProductsAsync(file, user?.userId);
  }

  @Post('products/validate')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file', ImportsController.uploadOptions))
  validateProducts(@UploadedFile() file: Express.Multer.File) {
    return this.importsService.validateProductsImport(file);
  }

  @Post('jobs/:jobId/retry')
  @Permissions('run_imports')
  retry(@Param('jobId') jobId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.importsService.retry(jobId, user?.userId);
  }
}
