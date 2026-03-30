import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  async list(query: {
    page?: number;
    limit?: number;
    department?: string;
    status?: string;
    search?: string;
  }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.department) filter.department = query.department;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { employeeId: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.employeeModel.find(filter).skip(skip).limit(limit).exec(),
      this.employeeModel.countDocuments(filter),
    ]);

    return {
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async stats() {
    const employees = await this.employeeModel.find();
    const byDepartment: Record<string, number> = {};

    for (const e of employees) {
      byDepartment[e.department || 'Unassigned'] =
        (byDepartment[e.department || 'Unassigned'] || 0) + 1;
    }

    return {
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      inactive: employees.filter((e) => e.status === 'inactive').length,
      terminated: employees.filter((e) => e.status === 'terminated').length,
      byDepartment,
    };
  }

  async byDepartment(department: string) {
    const employees = await this.employeeModel.find({ department, status: 'active' });
    return { department, count: employees.length, employees };
  }

  async create(dto: CreateEmployeeDto) {
    const exists = await this.employeeModel.findOne({
      $or: [{ employeeId: dto.employeeId }, { email: dto.email.toLowerCase() }],
    });

    if (exists) {
      throw new BadRequestException('Employee ID or email already exists');
    }

    const created = await this.employeeModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      department: dto.department || 'Warehouse',
      status: 'active',
    });

    return { message: 'Employee created successfully', employee: created };
  }

  async getByMongoId(id: string) {
    const employee = await this.employeeModel.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.employeeModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });

    if (!employee) throw new NotFoundException('Employee not found');
    return { message: 'Employee updated successfully', employee };
  }

  async remove(id: string) {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      {
        status: 'terminated',
      },
      { new: true },
    );

    if (!employee) throw new NotFoundException('Employee not found');
    return { message: 'Employee terminated successfully' };
  }
}
