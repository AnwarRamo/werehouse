"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const employee_schema_1 = require("./schemas/employee.schema");
let EmployeesService = class EmployeesService {
    constructor(employeeModel) {
        this.employeeModel = employeeModel;
    }
    async list(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 50);
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.department)
            filter.department = query.department;
        if (query.status)
            filter.status = query.status;
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
        const byDepartment = {};
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
    async byDepartment(department) {
        const employees = await this.employeeModel.find({ department, status: 'active' });
        return { department, count: employees.length, employees };
    }
    async create(dto) {
        const exists = await this.employeeModel.findOne({
            $or: [{ employeeId: dto.employeeId }, { email: dto.email.toLowerCase() }],
        });
        if (exists) {
            throw new common_1.BadRequestException('Employee ID or email already exists');
        }
        const created = await this.employeeModel.create({
            ...dto,
            email: dto.email.toLowerCase(),
            department: dto.department || 'Warehouse',
            status: 'active',
        });
        return { message: 'Employee created successfully', employee: created };
    }
    async getByMongoId(id) {
        const employee = await this.employeeModel.findById(id);
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return employee;
    }
    async update(id, dto) {
        const employee = await this.employeeModel.findByIdAndUpdate(id, dto, {
            new: true,
            runValidators: true,
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return { message: 'Employee updated successfully', employee };
    }
    async remove(id) {
        const employee = await this.employeeModel.findByIdAndUpdate(id, {
            status: 'terminated',
        }, { new: true });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return { message: 'Employee terminated successfully' };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(employee_schema_1.Employee.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map