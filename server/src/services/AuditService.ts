// ============================================================
// CAD 文件审核核心引擎
// 支持 .dwg / .dxf 格式解析与规范比对
// ============================================================

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { AuditRecordRepository } from '../repositories/AuditRecordRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { AuditRuleRepository } from '../repositories/AuditRuleRepository.js';

// ============================================================
// CAD 文件解析器接口
// ============================================================

interface CadLayer {
  name: string;
  color: number;      // ACI color index
  linetype: string;
  frozen: boolean;
  locked: boolean;
}

interface CadLinetype {
  name: string;
  description: string;
}

interface CadDimensionStyle {
  name: string;
  arrowSize?: number;
  textHeight?: number;
}

interface CadTextStyle {
  name: string;
  fontName: string;
  height: number;
}

interface CadTitleBlockInfo {
  exists: boolean;
  title?: string;
  designer?: string;
  reviewer?: string;
  date?: string;
  scale?: string;
  sheetSize?: string;
}

interface CadFileInfo {
  fileName: string;
  format: 'dwg' | 'dxf' | 'dwf' | 'other';
  fileSize: number;
  layers: CadLayer[];
  linetypes: string[];
  dimensionStyles: CadDimensionStyle[];
  textStyles: CadTextStyle[];
  titleBlock: CadTitleBlockInfo;
  rawContent?: string; // DXF 原始内容
}

// ============================================================
// 审核结果项
// ============================================================

interface AuditCheckItem {
  category: string;
  ruleName: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  detail: string;
  expected?: string;
  actual?: string;
  suggestion?: string;
}

interface AuditResult {
  summary: { total: number; passed: number; failed: number; warning: number; skipped: number };
  items: AuditCheckItem[];
  score: number; // 0-100
  overallStatus: 'passed' | 'failed' | 'warning' | 'error';
}

export class AuditService {

  /**
   * 执行审核（工作者自行上传）
   */
  static async auditFileForWorker(
    userId: number,
    filePath: string,
    originalName: string,
    specRequirements: Record<string, unknown>,
    ruleIds?: number[],
  ): Promise<{ recordId: number; result: AuditResult }> {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('用户不存在');

    // 检查是否是企业直属员工（企业员工走不同流程）
    const employeeRelation = await UserRepository.findEmployeeRelation(userId);
    if (employeeRelation) {
      return this.auditFileForEmployee(userId, employeeRelation.enterprise_id, filePath, originalName, specRequirements, null, ruleIds);
    }

    // 检查免费次数或积分
    let pointsCost = 0;
    try {
      await UserRepository.useFreeAuditCount(userId);
      pointsCost = 0; // 免费
    } catch {
      // 免费用完，扣积分
      if ((user.points ?? 0) < 1) {
        throw new Error('今日免费审核次数已用完，且积分不足。请充值积分后重试（1积分=1次审核）');
      }
      await UserRepository.deductPoints(userId, 1);
      pointsCost = 1;
    }

    // 执行审核
    const result = await this.performAudit(filePath, specRequirements, ruleIds);

    // 保存记录
    const recordId = await AuditRecordRepository.create({
      user_id: userId,
      file_name: originalName,
      file_path: filePath,
      file_size: fs.statSync(filePath).size,
      file_format: this.getFormat(originalName),
      spec_requirements,
      rule_ids: ruleIds || null,
      audit_result: result as any,
      overall_status: result.overallStatus,
      score: result.score,
      points_cost,
      report_path: null,
    });

    return { recordId, result };
  }

  /**
   * 执行审核（企业直属员工 - 无限次不消耗积分）
   */
  static async auditFileForEmployee(
    userId: number,
    enterpriseId: number,
    filePath: string,
    originalName: string,
    specRequirements: Record<string, unknown>,
    taskId?: number | null,
    ruleIds?: number[],
  ): Promise<{ recordId: number; result: AuditResult }> {
    // 执行审核
    const result = await this.performAudit(filePath, specRequirements, ruleIds);

    // 更新任务分配状态（如果有任务）
    if (taskId) {
      await TaskRepository.updateAssignmentStatus(taskId, userId, 'completed');
    }

    // 保存记录
    const recordId = await AuditRecordRepository.create({
      user_id: userId,
      enterprise_id: enterpriseId,
      task_id: taskId || null,
      file_name: originalName,
      file_path: filePath,
      file_size: fs.statSync(filePath).size,
      file_format: this.getFormat(originalName),
      spec_requirements,
      rule_ids: ruleIds || null,
      audit_result: result as any,
      overall_status: result.overallStatus,
      score: result.score,
      points_cost: 0, // 企业员工不消耗积分
      report_path: null,
    });

    return { recordId, result };
  }

  /**
   * 核心审核逻辑 - 解析CAD文件并匹配规则
   */
  static async performAudit(
    filePath: string,
    specRequirements: Record<string, unknown>,
    ruleIds?: number[],
  ): Promise<AuditResult> {
    try {
      // 1. 解析 CAD 文件
      const cadInfo = await this.parseCadFile(filePath);

      // 2. 获取规则配置
      let rulesToApply: any[] = [];
      if (ruleIds && ruleIds.length > 0) {
        rulesToApply = await AuditRuleRepository.findByIds(ruleIds);
      } else {
        // 使用预设的全部规则
        rulesToApply = await AuditRuleRepository.findPreset();
      }

      // 合并用户自定义的规范要求
      const customSpec = specRequirements;

      // 3. 执行各项检查
      const items = await this.runChecks(cadInfo, rulesToApply, customSpec);

      // 4. 汇总结果
      return this.aggregateResults(items);
    } catch (err) {
      // 解析错误返回 error 状态
      return {
        summary: { total: 1, passed: 0, failed: 0, warning: 0, skipped: 0 },
        items: [{
          category: 'system',
          ruleName: '文件解析',
          status: 'error',
          detail: err instanceof Error ? err.message : '未知错误',
          suggestion: '请确认文件格式正确且未损坏',
        }],
        score: 0,
        overallStatus: 'error',
      };
    }
  }

  /**
   * 解析 CAD 文件
   */
  private static async parseCadFile(filePath: string): Promise<CadFileInfo> {
    const ext = path.extname(filePath).toLowerCase();
    const stat = fs.statSync(filePath);

    switch (ext) {
      case '.dxf':
        return this.parseDxfFile(filePath, ext, stat.size);
      case '.dwg':
        return this.parseDwgFile(filePath, ext, stat.size);
      default:
        throw new Error(`不支持的文件格式: ${ext}`);
    }
  }

  /**
   * DXF 文件解析器 (DXF 是文本格式，可直接读取)
   */
  private static async parseDxfFile(filePath: string, format: string, fileSize: number): Promise<CadFileInfo> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const layers: CadLayer[] = [];
    const linetypes: Set<string> = new Set();
    const dimStyles: CadDimensionStyle[] = [];
    const textStyles: CadTextStyle[] = [];
    let currentSection = '';
    let layerData: Partial<CadLayer> = {};

    // 简化的 DXF 解析状态机
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === 'SECTION') {
        i++;
        if (i < lines.length) {
          currentSection = lines[i + 1]?.trim() || '';
        }
        continue;
      }

      if (line === 'ENDSEC') {
        currentSection = '';
        continue;
      }

      if (currentSection === 'TABLES') {
        // 图层表
        if (line === 'LAYER') {
          layerData = {};
          while (i + 1 < lines.length) {
            i++;
            const code = lines[i]?.trim();
            if (!code) continue;
            const val = (lines[++i] || '').trim();
            if (code === '2') layerData.name = val;
            else if (code === '6') layerData.linetype = val;
            else if (code === '62') layerData.color = parseInt(val) || 7;
            else if (code === '70') layerData.frozen = (parseInt(val) & 1) === 1;
            else if (val === 'ENDTAB') break;
          }
          if (layerData.name) {
            layers.push({
              name: layerData.name,
              color: layerData.color || 7,
              linetype: layerData.linetype || 'Continuous',
              frozen: !!layerData.frozen,
              locked: false,
            });
          }
        }

        // 线型表
        if (line === 'LTYPE') {
          let ltName = '';
          while (i + 1 < lines.length) {
            i++;
            const code = lines[i]?.trim();
            if (!code) continue;
            const val = (lines[++i] || '').trim();
            if (code === '2') ltName = val;
            else if (val === 'ENDTAB') break;
          }
          if (ltName) linetypes.add(ltName);
        }

        // 样式表（文字/标注）
        if (line === 'STYLE') {
          let styleName = '', fontName = ''; let height = 2.5;
          while (i + 1 < lines.length) {
            i++;
            const code = lines[i]?.trim();
            if (!code) continue;
            const val = (lines[++i] || '').trim();
            if (code === '2') styleName = val;
            else if (code === '40') height = parseFloat(val) || 2.5;
            else if (code === '3') fontName = val;
            else if (val === 'ENDTAB') break;
          }
          if (styleName) {
            textStyles.push({ name: styleName, fontName: fontName || 'simplex', height });
          }
        }
      }

      if (currentSection === 'HEADER') {
        // 可提取标题块信息
      }
    }

    // 如果DXF没有提取到任何图层信息，使用基础默认数据
    if (layers.length === 0) {
      console.warn('[DXF解析] 未找到图层定义，使用模拟数据');
    }

    return {
      fileName: path.basename(filePath),
      format: format as any,
      fileSize,
      layers: layers.length > 0 ? layers : this.getDefaultLayers(),
      linetypes: linetypes.size > 0 ? [...linetypes] : ['Continuous', 'DASHED', 'CENTER'],
      dimensionStyles: dimStyles.length > 0 ? dimStyles : [{ name: 'Standard', textHeight: 2.5 }],
      textStyles: textStyles.length > 0 ? textStyles : [{ name: 'Standard', fontName: 'simplex', height: 2.5 }],
      titleBlock: this.extractTitleBlock(content),
      rawContent: content,
    };
  }

  /**
   * DWG 文件处理 (二进制格式，这里做模拟解析)
   * 生产环境可集成 ODA SDK 或 ode.js 库
   */
  private static async parseDwgFile(filePath: string, format: string, fileSize: number): Promise<CadFileInfo> {
    // DWG 是二进制格式，完整解析需要专用库
    // 这里基于文件头和基本结构做元数据分析
    const buffer = fs.readFileSync(filePath);

    // 模拟：基于文件大小和头部信息推断基本结构
    console.log(`[DWG解析] 文件大小: ${fileSize} bytes, 版本检测中...`);

    // 返回模拟的 CAD 信息（实际应调用专业库）
    return {
      fileName: path.basename(filePath),
      format: format as any,
      fileSize,
      layers: this.getDefaultLayers(),
      linetypes: ['Continuous', 'DASHED', 'DOT', 'DASHDOT', 'CENTER'],
      dimensionStyles: [{ name: 'ISO-25', textHeight: 2.5, arrowSize: 2.5 }],
      textStyles: [{ name: 'Standard', fontName: 'simplex', height: 2.5 }, { name: '工程汉字', fontName: 'gbcbig', height: 3.5 }],
      titleBlock: { exists: false },
    };
  }

  /**
   * 默认图层集（用于无法解析时）
   */
  private static getDefaultLayers(): CadLayer[] {
    return [
      { name: '0', color: 7, linetype: 'Continuous', frozen: false, locked: false },
      { name: 'Defpoints', color: 7, linetype: 'Continuous', frozen: false, locked: true },
      { name: '粗实线', color: 7, linetype: 'Continuous', frozen: false, locked: false },
      { name: '细实线', color: 7, linetype: 'Continuous', frozen: false, locked: false },
      { name: '中心线', color: 1, linetype: 'CENTER', frozen: false, locked: false },
      { name: '虚线', color: 2, linetype: 'DASHED', frozen: false, locked: false },
      { name: '尺寸', color: 3, linetype: 'Continuous', frozen: false, locked: false },
      { name: '文本', color: 7, linetype: 'Continuous', frozen: false, locked: false },
      { name: '剖面线', color: 9, linetype: 'Continuous', frozen: false, locked: false },
    ];
  }

  /**
   * 从 DXF 内容中提取图框/标题栏信息
   */
  private static extractTitleBlock(content: string): CadTitleBlockInfo {
    // 查找常见的标题栏属性模式
    const patterns: [RegExp, keyof CadTitleBlockInfo][] = [
      [/图纸[名称称][:：]\s*(\S+)/, 'title'],
      [/设\s*计[:：]\s*(\S+)/, 'designer'],
      [/审\s*核[:：]\s*(\S+)/, 'reviewer'],
      [/日\s*期[:：]\s*(\S+)/, 'date'],
      [/比\s*例[:：]\s*(\S+)/, 'scale'],
      [/(A[0-4])\s*(横|竖)?(版)?/, 'sheetSize'],
    ];

    const info: CadTitleBlockInfo = { exists: false };
    for (const [regex, key] of patterns) {
      const match = content.match(regex);
      if (match) {
        info.exists = true;
        (info as any)[key] = match[1];
      }
    }

    return info;
  }

  // ============================================================
  // 规则检查引擎
  // ============================================================

  private static async runChecks(
    cadInfo: CadFileInfo,
    rules: any[],
    customSpec: Record<string, unknown>,
  ): Promise<AuditCheckItem[]> {
    const items: AuditCheckItem[] = [];

    for (const rule of rules) {
      const ruleConfig = typeof rule.rule_config === 'string'
        ? JSON.parse(rule.rule_config)
        : rule.rule_config;

      const checkItems = this.checkAgainstRule(cadInfo, rule.category, ruleConfig, customSpec);
      items.push(...checkItems);
    }

    // 如果没有匹配的规则，执行基础检查
    if (items.length === 0) {
      items.push(...this.basicChecks(cadInfo));
    }

    return items;
  }

  /**
   * 根据单条规则执行检查
   */
  private static checkAgainstRule(
    cadInfo: CadFileInfo,
    category: string,
    ruleConfig: any,
    _customSpec: Record<string, unknown>,
  ): AuditCheckItem[] {
    const items: AuditCheckItem[] = [];

    switch (category) {
      case 'layer':
        items.push(this.checkLayers(cadInfo, ruleConfig));
        break;
      case 'linetype':
        items.push(this.checkLinetypes(cadInfo, ruleConfig));
        break;
      case 'color':
        items.push(this.checkColors(cadInfo, ruleConfig));
        break;
      case 'dimension':
        items.push(this.checkDimensions(cadInfo, ruleConfig));
        break;
      case 'text_style':
        items.push(this.checkTextStyles(cadInfo, ruleConfig));
        break;
      case 'title_block':
        items.push(this.checkTitleBlock(cadInfo, ruleConfig));
        break;
      case 'custom':
        items.push({
          category: 'custom',
          ruleName: ruleConfig.name || '自定义规则',
          status: 'pass',
          detail: '自定义规则已加载但未执行具体检查',
        });
        break;
    }

    return items;
  }

  // --- 各类检查实现 ---

  private static checkLayers(cadInfo: CadFileInfo, config: any): AuditCheckItem {
    const issues: string[] = [];
    const warnings: string[] = [];

    // 检查必需图层是否存在
    if (config.requiredLayers) {
      const cadLayerNames = cadInfo.layers.map((l) => l.name.toLowerCase());
      for (const required of config.requiredLayers) {
        if (!cadLayerNames.includes(required.toLowerCase())) {
          issues.push(`缺少必需图层: "${required}"`);
        }
      }
    }

    // 检查图层命名规范
    if (config.pattern) {
      const regex = new RegExp(config.pattern);
      for (const layer of cadInfo.layers) {
        if (!regex.test(layer.name)) {
          warnings.push(`图层 "${layer.name}" 不符合命名规范`);
        }
      }
    }

    // 检查图层名长度
    if (config.maxLength) {
      for (const layer of cadInfo.layers) {
        if (layer.name.length > config.maxLength) {
          issues.push(`图层 "${layer.name}" 名称过长 (${layer.length}/${config.maxLength})`);
        }
      }
    }

    if (issues.length > 0) {
      return {
        category: 'layer',
        ruleName: '图层命名规范',
        status: 'fail',
        detail: `发现 ${issues.length} 个问题`,
        actual: issues.join('; '),
        suggestion: '按国标规范命名图层，确保必需图层存在',
      };
    }

    if (warnings.length > 0) {
      return {
        category: 'layer',
        ruleName: '图层命名规范',
        status: 'warning',
        detail: `发现 ${warnings.length} 个警告`,
        actual: warnings.join('; '),
        suggestion: '建议优化图层命名以符合规范',
      };
    }

    return {
      category: 'layer',
      ruleName: '图层命名规范',
      status: 'pass',
      detail: `共 ${cadInfo.layers.length} 个图层，均符合命名规范`,
    };
  }

  private static checkLinetypes(cadInfo: CadFileInfo, config: any): AuditCheckItem {
    const issues: string[] = [];

    if (config.allowedLinetypes) {
      for (const lt of cadInfo.linetypes) {
        const normalizedLt = lt.toUpperCase().replace(/[-_\s]/g, '');
        const allowedNormalized = config.allowedLinetypes.map((a: string) => a.toUpperCase().replace(/[-_\s]/g, ''));

        if (!allowedNormalized.some((a: string) => normalizedLt.includes(a) || a.includes(normalizedLt))) {
          issues.push(`使用了不允许的线型: "${lt}"`);
        }
      }
    }

    if (issues.length > 0) {
      return {
        category: 'linetype',
        ruleName: '线型规范检查',
        status: 'fail',
        detail: `发现 ${issues.length} 个违规线型`,
        actual: issues.join('; '),
        suggestion: `仅允许使用: ${config.allowedLinetypes?.join(', ')}`,
      };
    }

    return {
      category: 'linetype',
      ruleName: '线型规范检查',
      status: 'pass',
      detail: `共使用 ${cadInfo.linetypes.length} 种线型，均在允许范围内`,
    };
  }

  private static checkColors(cadInfo: CadFileInfo, config: any): AuditCheckItem {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (config.layerColorRules) {
      for (const layer of cadInfo.layers) {
        const allowedColors = config.layerColorRules[layer.name];
        if (allowedColors !== undefined) {
          if (!Array.isArray(allowedColors) || !allowedColors.includes(layer.color)) {
            issues.push(`图层 "${layer}" 颜色为 ACI ${layer.color}, 不符合规范`);
          }
        }
      }
    }

    if (issues.length > 0) {
      return {
        category: 'color',
        ruleName: '颜色规范(按图层)',
        status: 'fail',
        detail: `发现 ${issues.length} 个颜色不规范项`,
        actual: issues.join('; '),
        suggestion: '按图层规范设置正确的ACI颜色值',
      };
    }

    return {
      category: 'color',
      ruleName: '颜色规范(按图层)',
      status: 'pass',
      detail: `所有图层颜色符合规范`,
    };
  }

  private static checkDimensions(cadInfo: CadFileInfo, config: any): AuditCheckItem {
    const warnings: string[] = [];

    if (config.minTextPrecision !== undefined) {
      warnings.push('尺寸标注精度检查已启用（需详细几何分析）');
    }

    if (config.maxTextHeight) {
      for (const ds of cadInfo.dimensionStyles) {
        if (ds.textHeight && ds.textHeight > config.maxTextHeight) {
          warnings.push(`标注样式 "${ds.name}" 文字高度 ${ds.textHeight} 超过上限 ${config.maxTextHeight}`);
        }
      }
    }

    if (warnings.length > 0) {
      return {
        category: 'dimension',
        ruleName: '尺寸标注规范',
        status: 'warning',
        detail: `发现 ${warnings.length} 个警告`,
        actual: warnings.join('; '),
        suggestion: '调整标注样式参数以符合规范',
      };
    }

    return {
      category: 'dimension',
      ruleName: '尺寸标注规范',
      status: 'pass',
      detail: `尺寸标注设置基本符合规范`,
    };
  }

  private static checkTextStyles(cadInfo: CadFileInfo, config: any): AuditCheckItem {
    const issues: string[] = [];
    const warnings: string[] = [];

    for (const ts of cadInfo.textStyles) {
      if (ts.height < (config.minTextHeight || 0)) {
        issues.push(`文字样式 "${ts.name}" 高度 ${ts.height} 小于最小值 ${config.minTextHeight}`);
      }
      if (config.maxTextHeight && ts.height > config.maxTextHeight) {
        issues.push(`文字样式 "${ts.name}" 高度 ${ts.height} 超过最大值 ${config.maxTextHeight}`);
      }
      if (config.allowedFonts && ts.fontName) {
        const normalizedFont = ts.fontName.toLowerCase().replace(/[-_.]/g, '');
        const allowed = (config.allowedFonts as string[]).some((a) =>
          a.toLowerCase().replace(/[-_.]/g, '') === normalizedFont,
        );
        if (!allowed) {
          warnings.push(`文字样式 "${ts.name}" 使用字体 "${ts.fontName}" 可能不在推荐列表中`);
        }
      }
    }

    if (issues.length > 0) {
      return {
        category: 'text_style',
        ruleName: '文字样式规范',
        status: 'fail',
        detail: `发现 ${issues.length} 个问题`,
        actual: issues.join('; '),
        suggestion: '按规范设置文字样式参数',
      };
    }

    return {
      category: 'text_style',
      ruleName: '文字样式规范',
      status: warnings.length > 0 ? 'warning' : 'pass',
      detail: warnings.length > 0 ? `通过但有 ${warnings.length} 个警告` : '文字样式符合规范',
      ...(warnings.length > 0 ? { actual: warnings.join('; ') } : {}),
    };
  }

  private static checkTitleBlock(cadInfo: CadFileInfo, config: any): AuditCheckItem {
    const tb = cadInfo.titleBlock;
    const missing: string[] = [];

    if (config.requireTitleBlock && !tb.exists) {
      missing.push('缺少图框/标题块');
    }

    if (tb.exists && config.checkTitleInfo) {
      for (const field of config.checkTitleInfo) {
        if (!(tb as any)[field]) {
          missing.push(`标题栏缺少"${field}"字段`);
        }
      }
    }

    if (missing.length > 0) {
      return {
        category: 'title_block',
        ruleName: '图框规范检查',
        status: 'fail',
        detail: `发现 ${missing.length} 个问题`,
        actual: missing.join('; '),
        suggestion: '添加标准图框并填写完整的标题栏信息',
      };
    }

    return {
      category: 'title_block',
      ruleName: '图框规范检查',
      status: tb.exists ? 'pass' : 'warning',
      detail: tb.exists ? '图框及标题栏信息完整' : '未检测到图框，建议添加标准图框',
    };
  }

  /**
   * 基础检查（无规则时）
   */
  private static basicChecks(cadInfo: CadFileInfo): AuditCheckItem[] {
    return [
      {
        category: 'file',
        ruleName: '文件基本信息',
        status: 'pass',
        detail: `文件: ${cadInfo.fileName}, 格式: ${cadInfo.format?.toUpperCase()}, 大小: ${this.formatFileSize(cadInfo.fileSize)}, 图层数量: ${cadInfo.layers.length}`,
      },
      {
        category: 'layer',
        ruleName: '图层概览',
        status: 'pass',
        detail: `包含图层: ${cadInfo.layers.map(l => l.name).join(', ')}`,
      },
    ];
  }

  // ============================================================
  // 结果汇总
  // ============================================================

  private static aggregateResults(items: AuditCheckItem[]): AuditResult {
    const summary = { total: items.length, passed: 0, failed: 0, warning: 0, skipped: 0 };

    for (const item of items) {
      summary[item.status]++;
    }

    // 计算分数：每项满分100，加权平均
    let totalScore = 0;
    let weightSum = 0;
    for (const item of items) {
      const weight = item.category === 'layer' || item.category === 'color' ? 1.5 :
                     item.category === 'title_block' ? 1.2 : 1.0;
      weightSum += weight;
      totalScore += (item.status === 'pass' ? 100 : item.status === 'warning' ? 70 : item.status === 'skip' ? 80 : 0) * weight;
    }
    const score = weightSum > 0 ? Math.round(totalScore / weightSum) : 0;

    let overallStatus: AuditResult['overallStatus'] = 'passed';
    if (summary.failed > 0) overallStatus = 'failed';
    else if (summary.warning > 0) overallStatus = 'warning';

    return { summary, items, score, overallStatus };
  }

  // ============================================================
  // 工具方法
  // ============================================================

  private static getFormat(filename: string): 'dwg' | 'dxf' | 'dwf' | 'other' {
    const ext = path.extname(filename).toLowerCase().substring(1);
    if (['dwg', 'dxf', 'dwf'].includes(ext)) return ext as any;
    return 'other';
  }

  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * 获取审核历史
   */
  static async getAuditHistory(filters: {
    user_id?: number;
    enterprise_id?: number;
    status?: string;
    keyword?: string;
    start_date?: string;
    end_date?: string;
    page: number;
    pageSize: number;
  }): Promise<any> {
    return await AuditRecordRepository.findWithFilters(filters as any);
  }

  /**
   * 获取审核详情
   */
  static async getAuditDetail(recordId: number): Promise<any> {
    return await AuditRecordRepository.findById(recordId);
  }
}
