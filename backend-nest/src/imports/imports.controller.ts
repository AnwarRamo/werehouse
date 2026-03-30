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
import { Response } from 'express';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('history')
  @Permissions('view_imports')
  history(@Query() query: any) {
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
  @UseInterceptors(FileInterceptor('file'))
  importEmployees(@UploadedFile() file: any, @CurrentUser() user: any) {
    return this.importsService.importEmployees(file, user?.userId);
  }

  @Post('employees/validate')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file'))
  validateEmployees(@UploadedFile() file: any) {
    return this.importsService.validateEmployeesImport(file);
  }

  @Post('products')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file'))
  importProducts(@UploadedFile() file: any, @CurrentUser() user: any) {
    return this.importsService.importProducts(file, user?.userId);
  }

  @Post('products/validate')
  @Permissions('run_imports')
  @UseInterceptors(FileInterceptor('file'))
  validateProducts(@UploadedFile() file: any) {
    return this.importsService.validateProductsImport(file);
  }

  @Post('jobs/:jobId/retry')
  @Permissions('run_imports')
  retry(@Param('jobId') jobId: string, @CurrentUser() user: any) {
    return this.importsService.retry(jobId, user?.userId);
  }
}
