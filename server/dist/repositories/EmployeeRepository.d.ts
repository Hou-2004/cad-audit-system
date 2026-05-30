import { Employee, RegistrationMethod } from '../types/index.js';
export declare class EmployeeRepository {
    static findByEnterpriseId(enterpriseId: number): Promise<Employee[]>;
    static findByUserId(userId: number): Promise<Employee | null>;
    static isEmployeeOf(enterpriseId: number, userId: number): Promise<boolean>;
    static create(data: {
        enterprise_id: number;
        user_id: number;
        is_admin?: boolean;
        registration_method?: RegistrationMethod;
    }): Promise<number>;
    static remove(enterpriseId: number, userId: number): Promise<boolean>;
    static setAdmin(enterpriseId: number, userId: number, isAdmin: boolean): Promise<boolean>;
    static countByEnterprise(enterpriseId: number): Promise<number>;
    private static formatRow;
}
//# sourceMappingURL=EmployeeRepository.d.ts.map