import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, CheckCircle, XCircle } from 'lucide-react';

const MobileStats = ({ 
    gridStats, 
    selectedRoadType, 
    roadStandards,
    className = '' 
}) => {
    // Get road standards for compliance check
    const getRoadStandards = (roadType) => {
        const standards = {
            arterial: {
                lAvgMin: 17.0,
                uniformityRatioMax: 3.99,
                description: 'Jalan Arterial'
            },
            collector: {
                lAvgMin: 12.0,
                uniformityRatioMax: 4.99,
                description: 'Jalan Kolektor'
            },
            local: {
                lAvgMin: 9.0,
                uniformityRatioMax: 6.99,
                description: 'Jalan Lokal'
            },
            lingkungan: {
                lAvgMin: 6.0,
                uniformityRatioMax: 6.99,
                description: 'Jalan Lingkungan'
            }
        };
        return standards[roadType] || null;
    };

    const standards = getRoadStandards(selectedRoadType);
    
    // Calculate compliance
    const compliance = standards ? {
        lAvgCompliant: gridStats.lAvg >= standards.lAvgMin,
        ratioCompliant: gridStats.uniformityRatio <= standards.uniformityRatioMax,
        get overallCompliant() {
            return this.lAvgCompliant && this.ratioCompliant;
        }
    } : null;

    const StatCard = ({ icon: Icon, label, value, unit, status, description, color = 'blue' }) => (
        <div className={`mobile-card relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`}></div>
            <div className="mobile-card-body">
                <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-${color}-100`}>
                        <Icon className={`w-5 h-5 text-${color}-600`} />
                    </div>
                    {status && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            status === 'OK' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                        }`}>
                            {status === 'OK' ? (
                                <CheckCircle className="w-3 h-3" />
                            ) : (
                                <XCircle className="w-3 h-3" />
                            )}
                            {status}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-bold text-${color}-700`}>{value}</span>
                        {unit && <span className={`text-sm text-${color}-600`}>{unit}</span>}
                    </div>
                    <div className="text-sm font-medium text-gray-700">{label}</div>
                    {description && (
                        <div className="text-xs text-gray-500">{description}</div>
                    )}
                </div>
            </div>
        </div>
    );

    const ComplianceCard = () => {
        if (!compliance || !standards) return null;

        return (
            <div className={`mobile-card ${
                compliance.overallCompliant 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
            }`}>
                <div className="mobile-card-body">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-full ${
                            compliance.overallCompliant 
                                ? 'bg-green-100' 
                                : 'bg-red-100'
                        }`}>
                            {compliance.overallCompliant ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : (
                                <XCircle className="w-6 h-6 text-red-600" />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className={`font-semibold ${
                                compliance.overallCompliant 
                                    ? 'text-green-800' 
                                    : 'text-red-800'
                            }`}>
                                {compliance.overallCompliant ? 'MEMENUHI STANDAR' : 'TIDAK MEMENUHI STANDAR'}
                            </div>
                            <div className="text-sm text-gray-600">{standards.description}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                            <span className="text-sm text-gray-600">L-Avg ≥ {standards.lAvgMin} lux</span>
                            <div className={`flex items-center gap-1 text-xs font-medium ${
                                compliance.lAvgCompliant 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                            }`}>
                                {compliance.lAvgCompliant ? (
                                    <CheckCircle className="w-3 h-3" />
                                ) : (
                                    <XCircle className="w-3 h-3" />
                                )}
                                {compliance.lAvgCompliant ? 'OK' : 'NOT OK'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                            <span className="text-sm text-gray-600">Rasio ≤ {standards.uniformityRatioMax}</span>
                            <div className={`flex items-center gap-1 text-xs font-medium ${
                                compliance.ratioCompliant 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                            }`}>
                                {compliance.ratioCompliant ? (
                                    <CheckCircle className="w-3 h-3" />
                                ) : (
                                    <XCircle className="w-3 h-3" />
                                )}
                                {compliance.ratioCompliant ? 'OK' : 'NOT OK'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (gridStats.totalCells === 0) {
        return (
            <div className={`${className}`}>
                <div className="mobile-card">
                    <div className="mobile-card-body text-center py-8">
                        <div className="text-4xl mb-3">📊</div>
                        <div className="text-gray-500 font-medium">Belum ada data statistik</div>
                        <div className="text-sm text-gray-400 mt-1">Muat data terlebih dahulu</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Main Statistics Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={TrendingDown}
                    label="L-Min"
                    value={gridStats.lMin}
                    unit="lux"
                    color="red"
                    description="Nilai minimum"
                />
                <StatCard
                    icon={TrendingUp}
                    label="L-Max"
                    value={gridStats.lMax}
                    unit="lux"
                    color="green"
                    description="Nilai maksimum"
                />
                <StatCard
                    icon={BarChart3}
                    label="L-Avg"
                    value={gridStats.lAvg}
                    unit="lux"
                    color="blue"
                    description="Nilai rata-rata"
                    status={compliance?.lAvgCompliant ? 'OK' : (compliance ? 'NOT OK' : null)}
                />
                <StatCard
                    icon={Target}
                    label="Rasio Kemerataan"
                    value={gridStats.uniformityRatio}
                    color="purple"
                    description="L-Avg / L-Min"
                    status={compliance?.ratioCompliant ? 'OK' : (compliance ? 'NOT OK' : null)}
                />
            </div>

            {/* Data Summary */}
            <div className="mobile-card">
                <div className="mobile-card-body">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100">
                                <BarChart3 className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800">Total Data</div>
                                <div className="text-sm text-gray-600">Sel dengan nilai</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-700">{gridStats.totalCells}</div>
                            <div className="text-sm text-gray-500">sel</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compliance Status */}
            <ComplianceCard />

            {/* Color Legend */}
            <div className="mobile-card">
                <div className="mobile-card-header">
                    <h3 className="font-semibold text-gray-800">🎨 Legenda Warna</h3>
                </div>
                <div className="mobile-card-body">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
                            <span>0 lux</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
                            <span>{'<'} 20 lux</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-200 border border-orange-300 rounded"></div>
                            <span>20-40 lux</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-200 border border-yellow-300 rounded"></div>
                            <span>40-60 lux</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
                            <span>60-80 lux</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
                            <span>{'>'} 80 lux</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileStats;
