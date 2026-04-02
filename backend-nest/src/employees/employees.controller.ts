import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Permissions('view_employees')
  list(@Query() query: any) {
    return this.employeesService.list(query);
  }

  @Get('stats')
  @Permissions('view_employees')
  stats() {
    return this.employeesService.stats();
  }

  @Get('department/:department')
  @Permissions('view_employees')
  byDepartment(@Param('department') department: string) {
    return this.employeesService.byDepartment(department);
  }

  @Post()
  @Permissions('edit_employees')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get(':employeeId')
  @Permissions('view_employees')
  getOne(@Param('employeeId') employeeId: string) {
    return this.employeesService.getByEmployeeId(employeeId);
  }

  @Put(':employeeId')
  @Permissions('edit_employees')
  update(@Param('employeeId') employeeId: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(employeeId, dto);
  }

  @Delete(':employeeId')
  @Permissions('delete_employees')
  remove(@Param('employeeId') employeeId: string) {
    return this.employeesService.remove(employeeId);
  }
}
