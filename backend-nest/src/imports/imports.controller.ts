import {
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
      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const originalName = String(file?.originalname || '').toLowerCase();
      const hasAllowedExtension = allowedExtensions.some((ext) => originalName.endsWith(ext));
      const hasAllowedMime = allowedMimeTypes.includes(String(file?.mimetype || '').toLowerCase());

      if (!hasAllowedExtension && !hasAllowedMime) {
        cb(new Error('Only CSV/XLS/XLSX files are allowed'), false);
        return;
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
