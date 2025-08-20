import { EventEmitter } from 'events';

export interface ProjectMetrics {
  codeQuality: {
    maintainabilityIndex: number;
    technicalDebt: number;
    codeSmells: number;
    complexity: number;
    duplication: number;
  };
  security: {
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    securityScore: number;
    complianceScore: number;
  };
  performance: {
    bundleSize: number;
    loadTime: number;
    memoryUsage: number;
    performanceScore: number;
  };
  testing: {
    coverage: number;
    testQuality: number;
    testReliability: number;
  };
  dependencies: {
    total: number;
    outdated: number;
    vulnerable: number;
    licenseIssues: number;
  };
}

export interface ProjectHealth {
  overall: number;
  trends: {
    codeQuality: 'improving' | 'stable' | 'declining';
    security: 'improving' | 'stable' | 'declining';
    performance: 'improving' | 'stable' | 'declining';
    testing: 'improving' | 'stable' | 'declining';
  };
  recommendations: Array<{
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export interface TechnicalDebtItem {
  id: string;
  file: string;
  line: number;
  type: 'code_smell' | 'duplicate' | 'complexity' | 'security' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  effort: number; // hours
  impact: number; // business impact score
  created: Date;
  lastUpdated: Date;
}

export interface DependencyAnalysis {
  package: string;
  currentVersion: string;
  latestVersion: string;
  vulnerabilities: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    fixedIn?: string;
  }>;
  licenseIssues: string[];
  usageAnalysis: {
    importCount: number;
    lastUsed: Date;
    isTreeShakeable: boolean;
    alternativesAvailable: boolean;
  };
}

/**
 * Advanced Project Analytics Service
 * 
 * Provides comprehensive project analysis including:
 * - Code quality metrics and trends
 * - Security vulnerability assessment
 * - Performance analysis and optimization recommendations
 * - Technical debt tracking and prioritization
 * - Dependency analysis and management
 * - Project health scoring and recommendations
 */
export class AdvancedProjectAnalytics extends EventEmitter {
  private metrics: ProjectMetrics | null = null;
  private technicalDebt: TechnicalDebtItem[] = [];
  private dependencies: DependencyAnalysis[] = [];

  constructor() {
    super();
  }

  /**
   * Analyze entire project
   */
  async analyzeProject(projectPath: string, options: {
    includeMetrics?: boolean;
    includeSecurity?: boolean;
    includePerformance?: boolean;
    includeDependencies?: boolean;
    generateRecommendations?: boolean;
  } = {}): Promise<{
    metrics: ProjectMetrics;
    health: ProjectHealth;
    technicalDebt: TechnicalDebtItem[];
    dependencies: DependencyAnalysis[];
  }> {
    const {
      includeMetrics = true,
      includeSecurity = true,
      includePerformance = true,
      includeDependencies = true,
      generateRecommendations = true
    } = options;

    try {
      this.emit('analysisStarted', { projectPath, options });

      // Analyze code quality metrics
      const metrics = includeMetrics ? await this.analyzeCodeMetrics(projectPath) : this.getEmptyMetrics();
      
      // Analyze security
      if (includeSecurity) {
        metrics.security = await this.analyzeProjectSecurity(projectPath);
      }
      
      // Analyze performance
      if (includePerformance) {
        metrics.performance = await this.analyzeProjectPerformance(projectPath);
      }
      
      // Analyze dependencies
      const dependencies = includeDependencies ? await this.analyzeDependencies(projectPath) : [];
      
      // Identify technical debt
      const technicalDebt = await this.identifyTechnicalDebt(projectPath, metrics);
      
      // Calculate project health
      const health = generateRecommendations ? 
        await this.calculateProjectHealth(metrics, technicalDebt, dependencies) :
        this.getEmptyHealth();

      this.metrics = metrics;
      this.technicalDebt = technicalDebt;
      this.dependencies = dependencies;

      this.emit('analysisCompleted', {
        projectPath,
        overallHealth: health.overall,
        criticalIssues: technicalDebt.filter(item => item.severity === 'critical').length,
        vulnerabilities: metrics.security.vulnerabilities.critical + metrics.security.vulnerabilities.high
      });

      return { metrics, health, technicalDebt, dependencies };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('analysisError', { projectPath, error: errorMessage });
      throw error;
    }
  }

  /**
   * 📊 ANALYZE CODE METRICS
   */
  private async analyzeCodeMetrics(projectPath: string): Promise<ProjectMetrics> {
    return {
      codeQuality: {
        maintainabilityIndex: await this.calculateMaintainabilityIndex(projectPath),
        technicalDebt: await this.calculateTechnicalDebtScore(projectPath),
        codeSmells: await this.countCodeSmells(projectPath),
        complexity: await this.calculateAverageComplexity(projectPath),
        duplication: await this.calculateCodeDuplication(projectPath)
      },
      security: {
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
        securityScore: 0.8,
        complianceScore: 0.75
      },
      performance: {
        bundleSize: 0,
        loadTime: 0,
        memoryUsage: 0,
        performanceScore: 0.8
      },
      testing: {
        coverage: await this.calculateTestCoverage(projectPath),
        testQuality: await this.assessTestQuality(projectPath),
        testReliability: 0.85
      },
      dependencies: {
        total: await this.countDependencies(projectPath),
        outdated: 0,
        vulnerable: 0,
        licenseIssues: 0
      }
    };
  }

  /**
   * 🔒 ANALYZE PROJECT SECURITY
   */
  private async analyzeProjectSecurity(projectPath: string): Promise<ProjectMetrics['security']> {
    const vulnerabilities = await this.scanSecurityVulnerabilities(projectPath);
    const securityScore = this.calculateSecurityScore(vulnerabilities);
    const complianceScore = await this.assessComplianceScore(projectPath);

    return {
      vulnerabilities,
      securityScore,
      complianceScore
    };
  }

  /**
   * ⚡ ANALYZE PROJECT PERFORMANCE
   */
  private async analyzeProjectPerformance(projectPath: string): Promise<ProjectMetrics['performance']> {
    const bundleSize = await this.analyzeBundleSize(projectPath);
    const loadTime = await this.estimateLoadTime(projectPath);
    const memoryUsage = await this.analyzeMemoryUsage(projectPath);
    const performanceScore = this.calculatePerformanceScore(bundleSize, loadTime, memoryUsage);

    return {
      bundleSize,
      loadTime,
      memoryUsage,
      performanceScore
    };
  }

  /**
   * 📦 ANALYZE DEPENDENCIES
   */
  private async analyzeDependencies(projectPath: string): Promise<DependencyAnalysis[]> {
    const packageJsonPath = `${projectPath}/package.json`;
    // Mock implementation - would read actual package.json in real environment
    
    const mockDependencies: DependencyAnalysis[] = [
      {
        package: 'react',
        currentVersion: '18.2.0',
        latestVersion: '18.2.0',
        vulnerabilities: [],
        licenseIssues: [],
        usageAnalysis: {
          importCount: 25,
          lastUsed: new Date(),
          isTreeShakeable: false,
          alternativesAvailable: false
        }
      },
      {
        package: 'lodash',
        currentVersion: '4.17.20',
        latestVersion: '4.17.21',
        vulnerabilities: [
          {
            id: 'CVE-2021-23337',
            severity: 'medium',
            title: 'Command Injection',
            description: 'lodash versions prior to 4.17.21 are vulnerable to command injection',
            fixedIn: '4.17.21'
          }
        ],
        licenseIssues: [],
        usageAnalysis: {
          importCount: 5,
          lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          isTreeShakeable: true,
          alternativesAvailable: true
        }
      }
    ];

    return mockDependencies;
  }

  /**
   * 🔍 IDENTIFY TECHNICAL DEBT
   */
  private async identifyTechnicalDebt(projectPath: string, metrics: ProjectMetrics): Promise<TechnicalDebtItem[]> {
    const debtItems: TechnicalDebtItem[] = [];

    // Code smells
    if (metrics.codeQuality.codeSmells > 10) {
      debtItems.push({
        id: 'code-smells-high',
        file: 'Multiple files',
        line: 0,
        type: 'code_smell',
        severity: 'medium',
        description: `High number of code smells detected (${metrics.codeQuality.codeSmells})`,
        effort: 8,
        impact: 6,
        created: new Date(),
        lastUpdated: new Date()
      });
    }

    // High complexity
    if (metrics.codeQuality.complexity > 15) {
      debtItems.push({
        id: 'high-complexity',
        file: 'Multiple files',
        line: 0,
        type: 'complexity',
        severity: 'high',
        description: `Average complexity too high (${metrics.codeQuality.complexity})`,
        effort: 16,
        impact: 8,
        created: new Date(),
        lastUpdated: new Date()
      });
    }

    // Low test coverage
    if (metrics.testing.coverage < 0.8) {
      debtItems.push({
        id: 'low-test-coverage',
        file: 'Test files',
        line: 0,
        type: 'code_smell',
        severity: 'medium',
        description: `Test coverage below 80% (${Math.round(metrics.testing.coverage * 100)}%)`,
        effort: 12,
        impact: 7,
        created: new Date(),
        lastUpdated: new Date()
      });
    }

    // Security vulnerabilities
    const criticalVulns = metrics.security.vulnerabilities.critical;
    if (criticalVulns > 0) {
      debtItems.push({
        id: 'critical-security-vulns',
        file: 'Multiple files',
        line: 0,
        type: 'security',
        severity: 'critical',
        description: `${criticalVulns} critical security vulnerabilities found`,
        effort: 4,
        impact: 10,
        created: new Date(),
        lastUpdated: new Date()
      });
    }

    return debtItems.sort((a, b) => {
      // Sort by severity, then by impact
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      return b.impact - a.impact;
    });
  }

  /**
   * 💚 CALCULATE PROJECT HEALTH
   */
  private async calculateProjectHealth(
    metrics: ProjectMetrics, 
    technicalDebt: TechnicalDebtItem[], 
    dependencies: DependencyAnalysis[]
  ): Promise<ProjectHealth> {
    // Calculate overall health score
    const qualityScore = this.normalizeScore(metrics.codeQuality.maintainabilityIndex, 0, 100);
    const securityScore = metrics.security.securityScore;
    const performanceScore = metrics.performance.performanceScore;
    const testingScore = (metrics.testing.coverage + metrics.testing.testQuality) / 2;
    
    const overall = (qualityScore + securityScore + performanceScore + testingScore) / 4;

    // Determine trends (mock implementation)
    const trends = {
      codeQuality: this.determineTrend(qualityScore),
      security: this.determineTrend(securityScore),
      performance: this.determineTrend(performanceScore),
      testing: this.determineTrend(testingScore)
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, technicalDebt, dependencies);

    return { overall, trends, recommendations };
  }

  /**
   * 💡 GENERATE RECOMMENDATIONS
   */
  private generateRecommendations(
    metrics: ProjectMetrics, 
    technicalDebt: TechnicalDebtItem[], 
    dependencies: DependencyAnalysis[]
  ): ProjectHealth['recommendations'] {
    const recommendations: ProjectHealth['recommendations'] = [];

    // Critical security issues
    if (metrics.security.vulnerabilities.critical > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'critical',
        title: 'Address Critical Security Vulnerabilities',
        description: `${metrics.security.vulnerabilities.critical} critical security vulnerabilities require immediate attention`,
        impact: 'Prevents security breaches and data exposure',
        effort: 'low'
      });
    }

    // High complexity
    if (metrics.codeQuality.complexity > 15) {
      recommendations.push({
        category: 'Code Quality',
        priority: 'high',
        title: 'Reduce Code Complexity',
        description: 'High average complexity makes code harder to maintain and more error-prone',
        impact: 'Improves maintainability and reduces bugs',
        effort: 'high'
      });
    }

    // Low test coverage
    if (metrics.testing.coverage < 0.8) {
      recommendations.push({
        category: 'Testing',
        priority: 'medium',
        title: 'Improve Test Coverage',
        description: `Current coverage is ${Math.round(metrics.testing.coverage * 100)}%, aim for 80%+`,
        impact: 'Reduces bugs and improves confidence in releases',
        effort: 'medium'
      });
    }

    // Outdated dependencies
    const outdatedDeps = dependencies.filter(dep => dep.currentVersion !== dep.latestVersion);
    if (outdatedDeps.length > 5) {
      recommendations.push({
        category: 'Dependencies',
        priority: 'medium',
        title: 'Update Outdated Dependencies',
        description: `${outdatedDeps.length} dependencies are outdated`,
        impact: 'Improves security and access to latest features',
        effort: 'low'
      });
    }

    // Performance issues
    if (metrics.performance.performanceScore < 0.7) {
      recommendations.push({
        category: 'Performance',
        priority: 'medium',
        title: 'Optimize Performance',
        description: 'Performance score below 70% indicates optimization opportunities',
        impact: 'Improves user experience and SEO',
        effort: 'medium'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Helper methods for calculations
  private async calculateMaintainabilityIndex(projectPath: string): Promise<number> {
    // Mock implementation - simplified maintainability calculation
    return 75.5;
  }

  private async calculateTechnicalDebtScore(projectPath: string): Promise<number> {
    // Mock implementation
    return 15.2; // hours of technical debt
  }

  private async countCodeSmells(projectPath: string): Promise<number> {
    // Mock implementation
    return 8;
  }

  private async calculateAverageComplexity(projectPath: string): Promise<number> {
    // Mock implementation
    return 12.3;
  }

  private async calculateCodeDuplication(projectPath: string): Promise<number> {
    // Mock implementation - percentage
    return 3.2;
  }

  private async calculateTestCoverage(projectPath: string): Promise<number> {
    // Mock implementation
    return 0.72;
  }

  private async assessTestQuality(projectPath: string): Promise<number> {
    // Mock implementation
    return 0.8;
  }

  private async countDependencies(projectPath: string): Promise<number> {
    // Mock implementation
    return 42;
  }

  private async scanSecurityVulnerabilities(projectPath: string): Promise<ProjectMetrics['security']['vulnerabilities']> {
    // Mock implementation
    return {
      critical: 1,
      high: 3,
      medium: 5,
      low: 2
    };
  }

  private calculateSecurityScore(vulnerabilities: ProjectMetrics['security']['vulnerabilities']): number {
    const total = vulnerabilities.critical + vulnerabilities.high + vulnerabilities.medium + vulnerabilities.low;
    const weighted = (vulnerabilities.critical * 10) + (vulnerabilities.high * 5) + 
                    (vulnerabilities.medium * 2) + (vulnerabilities.low * 1);
    
    return Math.max(0, 1 - (weighted / 100));
  }

  private async assessComplianceScore(projectPath: string): Promise<number> {
    // Mock implementation - OWASP, security best practices compliance
    return 0.75;
  }

  private async analyzeBundleSize(projectPath: string): Promise<number> {
    // Mock implementation - KB
    return 1250.5;
  }

  private async estimateLoadTime(projectPath: string): Promise<number> {
    // Mock implementation - milliseconds
    return 2100;
  }

  private async analyzeMemoryUsage(projectPath: string): Promise<number> {
    // Mock implementation - MB
    return 45.8;
  }

  private calculatePerformanceScore(bundleSize: number, loadTime: number, memoryUsage: number): number {
    // Simplified performance scoring
    const sizeScore = Math.max(0, 1 - (bundleSize / 5000)); // Penalty after 5MB
    const timeScore = Math.max(0, 1 - (loadTime / 5000)); // Penalty after 5s
    const memoryScore = Math.max(0, 1 - (memoryUsage / 100)); // Penalty after 100MB
    
    return (sizeScore + timeScore + memoryScore) / 3;
  }

  private normalizeScore(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  private determineTrend(score: number): 'improving' | 'stable' | 'declining' {
    // Mock implementation - would compare with historical data
    if (score > 0.8) return 'improving';
    if (score > 0.6) return 'stable';
    return 'declining';
  }

  private getEmptyMetrics(): ProjectMetrics {
    return {
      codeQuality: {
        maintainabilityIndex: 0,
        technicalDebt: 0,
        codeSmells: 0,
        complexity: 0,
        duplication: 0
      },
      security: {
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
        securityScore: 0,
        complianceScore: 0
      },
      performance: {
        bundleSize: 0,
        loadTime: 0,
        memoryUsage: 0,
        performanceScore: 0
      },
      testing: {
        coverage: 0,
        testQuality: 0,
        testReliability: 0
      },
      dependencies: {
        total: 0,
        outdated: 0,
        vulnerable: 0,
        licenseIssues: 0
      }
    };
  }

  private getEmptyHealth(): ProjectHealth {
    return {
      overall: 0,
      trends: {
        codeQuality: 'stable',
        security: 'stable',
        performance: 'stable',
        testing: 'stable'
      },
      recommendations: []
    };
  }

  /**
   * Get project metrics dashboard data
   */
  getMetricsDashboard(): {
    summary: {
      overallHealth: number;
      criticalIssues: number;
      technicalDebtHours: number;
      securityScore: number;
    };
    charts: {
      qualityTrend: Array<{ date: string; score: number }>;
      vulnerabilityBreakdown: ProjectMetrics['security']['vulnerabilities'];
      testCoverageHistory: Array<{ date: string; coverage: number }>;
      dependencyRisks: Array<{ name: string; risk: number }>;
    };
  } {
    if (!this.metrics) {
      throw new Error('No metrics available. Run analyzeProject first.');
    }

    const summary = {
      overallHealth: this.calculateOverallHealth(),
      criticalIssues: this.technicalDebt.filter(item => item.severity === 'critical').length,
      technicalDebtHours: this.technicalDebt.reduce((sum, item) => sum + item.effort, 0),
      securityScore: this.metrics.security.securityScore
    };

    // Mock chart data
    const charts = {
      qualityTrend: [
        { date: '2024-01-01', score: 0.65 },
        { date: '2024-01-15', score: 0.70 },
        { date: '2024-02-01', score: 0.72 },
        { date: '2024-02-15', score: 0.75 }
      ],
      vulnerabilityBreakdown: this.metrics.security.vulnerabilities,
      testCoverageHistory: [
        { date: '2024-01-01', coverage: 0.65 },
        { date: '2024-01-15', coverage: 0.68 },
        { date: '2024-02-01', coverage: 0.70 },
        { date: '2024-02-15', coverage: 0.72 }
      ],
      dependencyRisks: this.dependencies.map(dep => ({
        name: dep.package,
        risk: dep.vulnerabilities.length * 0.2 + (dep.currentVersion !== dep.latestVersion ? 0.1 : 0)
      }))
    };

    return { summary, charts };
  }

  private calculateOverallHealth(): number {
    if (!this.metrics) return 0;
    
    const scores = [
      this.metrics.codeQuality.maintainabilityIndex / 100,
      this.metrics.security.securityScore,
      this.metrics.performance.performanceScore,
      this.metrics.testing.coverage
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Generate executive report
   */
  generateExecutiveReport(): {
    summary: string;
    keyFindings: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
    };
    recommendations: Array<{
      priority: 'critical' | 'high' | 'medium' | 'low';
      action: string;
      business_impact: string;
      timeline: string;
    }>;
    metrics: {
      codeHealth: string;
      securityPosture: string;
      performanceStatus: string;
      testingMaturity: string;
    };
  } {
    if (!this.metrics) {
      throw new Error('No metrics available. Run analyzeProject first.');
    }

    const overallHealth = this.calculateOverallHealth();
    
    const summary = `Project health analysis reveals an overall score of ${Math.round(overallHealth * 100)}%. ${
      overallHealth > 0.8 ? 'The project demonstrates strong engineering practices.' :
      overallHealth > 0.6 ? 'The project has good foundations but requires attention in key areas.' :
      'The project requires significant improvement to meet industry standards.'
    }`;

    const keyFindings = [
      `Code maintainability index: ${this.metrics.codeQuality.maintainabilityIndex}/100`,
      `Security vulnerabilities: ${this.metrics.security.vulnerabilities.critical} critical, ${this.metrics.security.vulnerabilities.high} high`,
      `Test coverage: ${Math.round(this.metrics.testing.coverage * 100)}%`,
      `Technical debt: ${this.technicalDebt.reduce((sum, item) => sum + item.effort, 0)} hours estimated`
    ];

    const riskLevel = 
      this.metrics.security.vulnerabilities.critical > 0 ? 'critical' :
      this.metrics.security.vulnerabilities.high > 3 ? 'high' :
      overallHealth < 0.6 ? 'medium' : 'low';

    const riskFactors = [];
    if (this.metrics.security.vulnerabilities.critical > 0) {
      riskFactors.push('Critical security vulnerabilities present');
    }
    if (this.metrics.testing.coverage < 0.7) {
      riskFactors.push('Low test coverage increases bug risk');
    }
    if (this.metrics.codeQuality.complexity > 15) {
      riskFactors.push('High code complexity impacts maintainability');
    }

    const recommendations = [
      {
        priority: 'critical' as const,
        action: 'Address critical security vulnerabilities immediately',
        business_impact: 'Prevents data breaches and regulatory issues',
        timeline: '1-2 weeks'
      },
      {
        priority: 'high' as const,
        action: 'Improve test coverage to 80%+',
        business_impact: 'Reduces production bugs and increases release confidence',
        timeline: '4-6 weeks'
      },
      {
        priority: 'medium' as const,
        action: 'Refactor high-complexity components',
        business_impact: 'Improves development velocity and reduces maintenance costs',
        timeline: '8-12 weeks'
      }
    ];

    const metrics = {
      codeHealth: this.getHealthDescription(this.metrics.codeQuality.maintainabilityIndex / 100),
      securityPosture: this.getHealthDescription(this.metrics.security.securityScore),
      performanceStatus: this.getHealthDescription(this.metrics.performance.performanceScore),
      testingMaturity: this.getHealthDescription(this.metrics.testing.coverage)
    };

    return {
      summary,
      keyFindings,
      riskAssessment: { level: riskLevel, factors: riskFactors },
      recommendations,
      metrics
    };
  }

  private getHealthDescription(score: number): string {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  }
}
