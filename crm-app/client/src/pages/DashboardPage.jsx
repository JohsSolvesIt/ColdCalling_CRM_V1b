import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Database, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Phone,
  Mail,
  Building,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Globe,
  Star,
  ArrowLeft
} from 'lucide-react';

const DashboardPage = ({ 
  rows = [], 
  currentDatabase, 
  systemStatus, 
  smsHistory = [],
  onBack,
  api 
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);

  // Calculate comprehensive metrics from real data
  const metrics = useMemo(() => {
    if (!rows || rows.length === 0) {
      return {
        totalContacts: 0,
        statusBreakdown: {},
        recentActivity: [],
        conversionRate: 0,
        avgResponseTime: 0,
        topPerformers: []
      };
    }

    // Total contacts
    const totalContacts = rows.length;

    // Status breakdown
    const statusBreakdown = rows.reduce((acc, contact) => {
      const status = contact.Status || 'New';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Calculate conversion metrics
    const soldCount = rows.filter(r => r.Status === 'SOLD!').length;
    const interestedCount = rows.filter(r => r.Status === 'Interested').length;
    const conversionRate = totalContacts > 0 ? ((soldCount / totalContacts) * 100).toFixed(1) : 0;
    const interestRate = totalContacts > 0 ? ((interestedCount / totalContacts) * 100).toFixed(1) : 0;

    // Recent activity (contacts with recent updates)
    const now = new Date();
    const timeRangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    const recentActivity = rows.filter(contact => {
      if (!contact.LastContacted) return false;
      const lastContactDate = new Date(contact.LastContacted);
      return (now - lastContactDate) <= timeRangeMs[timeRange];
    }).sort((a, b) => new Date(b.LastContacted) - new Date(a.LastContacted));

    // Communication metrics
    const contactsWithPhone = rows.filter(r => 
      Object.keys(r).some(key => /phone|mobile|tel/i.test(key) && r[key])
    ).length;

    const contactsWithEmail = rows.filter(r => 
      Object.keys(r).some(key => /email|mail/i.test(key) && r[key])
    ).length;

    // Follow-up metrics
    const followUpContacts = rows.filter(r => r.FollowUpAt).length;
    const overdueFollowUps = rows.filter(r => {
      if (!r.FollowUpAt) return false;
      return new Date(r.FollowUpAt) < now;
    }).length;

    // Property metrics (if available)
    const contactsWithProperties = rows.filter(r => 
      r.total_properties > 0 || (r.properties && r.properties.length > 0)
    ).length;

    // SMS metrics from real SMS history
    const smsStats = {
      totalSent: smsHistory.length,
      recentSms: smsHistory.filter(sms => {
        const smsDate = new Date(sms.timestamp || sms.sent_at || sms.created_at);
        return (now - smsDate) <= timeRangeMs[timeRange];
      }).length,
      successRate: smsHistory.length > 0 ? 
        ((smsHistory.filter(sms => sms.status === 'sent' || sms.status === 'delivered').length / smsHistory.length) * 100).toFixed(1) : 0
    };

    return {
      totalContacts,
      statusBreakdown,
      recentActivity: recentActivity.slice(0, 10), // Top 10 recent
      conversionRate: parseFloat(conversionRate),
      interestRate: parseFloat(interestRate),
      soldCount,
      interestedCount,
      contactsWithPhone,
      contactsWithEmail,
      followUpContacts,
      overdueFollowUps,
      contactsWithProperties,
      smsStats,
      dataQuality: {
        phoneRate: totalContacts > 0 ? ((contactsWithPhone / totalContacts) * 100).toFixed(1) : 0,
        emailRate: totalContacts > 0 ? ((contactsWithEmail / totalContacts) * 100).toFixed(1) : 0,
        propertyRate: totalContacts > 0 ? ((contactsWithProperties / totalContacts) * 100).toFixed(1) : 0
      }
    };
  }, [rows, timeRange, smsHistory]);

  // Fetch real-time system metrics
  const fetchRealtimeMetrics = async () => {
    if (!api) return;
    
    setRefreshing(true);
    try {
      // Fetch system status and database info
      const response = await api.get('/status');
      setRealtimeMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch realtime metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealtimeMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRealtimeMetrics, 30000);
    return () => clearInterval(interval);
  }, [api]);

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      'SOLD!': 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      'Interested': 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
      'No Answer': 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
      'Left Voicemail': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Not Interested': 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
      'SENT TEXT': 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
      'Callback Requested': 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
      'New': 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400'
    };
    return colors[status] || colors['New'];
  };

  const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue', subtitle }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-4">
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
          )}
          <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );

  const StatusChart = () => {
    const total = Object.values(metrics.statusBreakdown).reduce((sum, count) => sum + count, 0);
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Status Distribution</h3>
          <PieChart className="h-5 w-5 text-slate-400" />
        </div>
        <div className="space-y-3">
          {Object.entries(metrics.statusBreakdown)
            .sort(([,a], [,b]) => b - a)
            .map(([status, count]) => {
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-12 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pl-20 pr-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Back to main view"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CRM Dashboard</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentDatabase?.name ? `Database: ${currentDatabase.name}` : 'Real-time metrics and analytics'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            
            <button
              onClick={fetchRealtimeMetrics}
              disabled={refreshing}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Refresh metrics"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pl-20 pr-6 py-6 space-y-6">
        {/* System Status Bar */}
        {systemStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${systemStatus.database?.connected ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-2">
                <Database className={`h-5 w-5 ${systemStatus.database?.connected ? 'text-green-600' : 'text-red-600'}`} />
                <span className="font-medium">Database</span>
                <div className={`h-2 w-2 rounded-full ${systemStatus.database?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {systemStatus.database?.contactCount ? `${systemStatus.database.contactCount} contacts` : 'Status unknown'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${systemStatus.sms?.connected ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-2">
                <MessageSquare className={`h-5 w-5 ${systemStatus.sms?.connected ? 'text-green-600' : 'text-red-600'}`} />
                <span className="font-medium">SMS Service</span>
                <div className={`h-2 w-2 rounded-full ${systemStatus.sms?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {systemStatus.sms?.connected ? 'Active' : 'Disconnected'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${systemStatus.adb?.connected ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${systemStatus.adb?.connected ? 'text-green-600' : 'text-red-600'}`} />
                <span className="font-medium">ADB Service</span>
                <div className={`h-2 w-2 rounded-full ${systemStatus.adb?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {systemStatus.adb?.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Contacts"
            value={metrics.totalContacts.toLocaleString()}
            icon={Users}
            color="blue"
            subtitle={currentDatabase?.name || 'All databases'}
          />
          
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            icon={Target}
            color="green"
            subtitle={`${metrics.soldCount} sales`}
          />
          
          <MetricCard
            title="Interest Rate"
            value={`${metrics.interestRate}%`}
            icon={TrendingUp}
            color="emerald"
            subtitle={`${metrics.interestedCount} interested`}
          />
          
          <MetricCard
            title="Follow-ups"
            value={metrics.followUpContacts}
            icon={Calendar}
            color="orange"
            subtitle={metrics.overdueFollowUps > 0 ? `${metrics.overdueFollowUps} overdue` : 'All current'}
          />
        </div>

        {/* Communication & Data Quality Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Phone Coverage"
            value={`${metrics.dataQuality.phoneRate}%`}
            icon={Phone}
            color="blue"
            subtitle={`${metrics.contactsWithPhone} contacts`}
          />
          
          <MetricCard
            title="Email Coverage"
            value={`${metrics.dataQuality.emailRate}%`}
            icon={Mail}
            color="purple"
            subtitle={`${metrics.contactsWithEmail} contacts`}
          />
          
          <MetricCard
            title="SMS Sent"
            value={metrics.smsStats.totalSent}
            icon={MessageSquare}
            color="green"
            subtitle={`${metrics.smsStats.successRate}% success rate`}
          />
          
          <MetricCard
            title="Properties"
            value={`${metrics.dataQuality.propertyRate}%`}
            icon={Building}
            color="emerald"
            subtitle={`${metrics.contactsWithProperties} with properties`}
          />
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusChart />
          
          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {metrics.recentActivity.length > 0 ? (
                metrics.recentActivity.map((contact, index) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {contact.name || contact.agent_name || `Contact ${contact.id.substring(0, 8)}`}
                      </p>
                      <p className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getStatusColor(contact.Status)}`}>
                        {contact.Status || 'New'}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {contact.LastContacted ? new Date(contact.LastContacted).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity in selected time range</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        {realtimeMetrics && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">System Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {realtimeMetrics.uptime || '0s'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {realtimeMetrics.memory?.used || 'N/A'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Memory Usage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {realtimeMetrics.requests?.total || '0'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">API Requests</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
