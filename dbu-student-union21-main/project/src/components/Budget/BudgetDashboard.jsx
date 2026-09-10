/** @format */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Gift,
  ShieldCheck,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Building,
  Calendar,
  Tag,
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  PieChart,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_MAP = {
  ALLOCATION: {
    label: 'University Allocation',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeBg: 'bg-emerald-500',
    type: 'INFLOW',
  },
  DONATION: {
    label: 'Alumni / Partner Donation',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeBg: 'bg-indigo-500',
    type: 'INFLOW',
  },
  EXPENSE: {
    label: 'Operational Expense',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeBg: 'bg-rose-500',
    type: 'OUTFLOW',
  },
  GRANT_DISBURSEMENT: {
    label: 'Micro-Grant Disbursement',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeBg: 'bg-purple-500',
    type: 'OUTFLOW',
  },
};

export const BudgetDashboard = () => {
  const { user } = useAuth();
  const isAdmin =
    user &&
    (user.isAdmin === true ||
      ['admin', 'system_admin', 'clubs_coordinator', 'president'].includes(user.role));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    transactions: [],
    totals: { totalAllocations: 0, totalDonations: 0, totalExpenses: 0, totalGrants: 0, currentBalance: 0 },
    stats: { totalInflow: 0, totalOutflow: 0, transactionCount: 0 },
  });

  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Transaction Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'EXPENSE',
    amount: '',
    description: '',
    referenceNumber: '',
  });

  const fetchLedger = async () => {
    try {
      const res = await apiService.getBudgetLedger({
        category: filterCategory !== 'ALL' ? filterCategory : undefined,
        search: searchTerm.trim() || undefined,
      });

      if (res.data?.success) {
        setData({
          transactions: res.data.data.transactions || [],
          totals: res.data.data.totals || {
            totalAllocations: 0,
            totalDonations: 0,
            totalExpenses: 0,
            totalGrants: 0,
            currentBalance: 0,
          },
          stats: res.data.data.stats || { totalInflow: 0, totalOutflow: 0, transactionCount: 0 },
        });
      }
    } catch (err) {
      console.error('Failed to load budget ledger:', err);
      toast.error('Unable to sync with public treasury ledger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filterCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLedger();
  };

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid title and positive amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.recordBudgetTransaction({
        ...formData,
        amount: Number(formData.amount),
      });

      if (res.data?.success) {
        toast.success('Transaction logged onto public financial ledger!');
        setIsModalOpen(false);
        setFormData({
          title: '',
          category: 'EXPENSE',
          amount: '',
          description: '',
          referenceNumber: '',
        });
        fetchLedger();
      }
    } catch (err) {
      console.error('Failed to record transaction:', err);
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatETB = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const inflowPercent = data.stats.totalInflow + data.stats.totalOutflow > 0
    ? Math.round((data.stats.totalInflow / (data.stats.totalInflow + data.stats.totalOutflow)) * 100)
    : 50;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Public Financial Ledger • Transparency 2.0</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Transparent Budget & Micro-Grants
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Open financial governance for Debre Berhan University and the Ethiopian Inter-University Federation. Every allocation, expense, and student innovation grant is publicly recorded in real time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/grants"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Micro-Grants Pool</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              {isAdmin && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold shadow-lg transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Record Transaction</span>
                </button>
              )}

              <button
                onClick={() => {
                  setRefreshing(true);
                  fetchLedger();
                }}
                disabled={refreshing}
                title="Sync Ledger"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Treasury Balance */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Treasury Balance</span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatETB(data.totals.currentBalance)} <span className="text-xs font-semibold text-slate-400">ETB</span>
            </div>
            <div className="mt-2 text-xs font-medium text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Audited & Solvent</span>
            </div>
          </div>

          {/* Total Inflow (Allocations + Donations) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Inflow</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              +{formatETB(data.stats.totalInflow)} <span className="text-xs font-semibold text-slate-400">ETB</span>
            </div>
            <div className="mt-2 text-xs font-medium text-slate-500">
              Allocations ({formatETB(data.totals.totalAllocations)}) & Gifts
            </div>
          </div>

          {/* Operational Expenses */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Club & Union Expenses</span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
              -{formatETB(data.totals.totalExpenses)} <span className="text-xs font-semibold text-slate-400">ETB</span>
            </div>
            <div className="mt-2 text-xs font-medium text-slate-500">
              Event logistics, kits, hardware
            </div>
          </div>

          {/* Micro-Grants Disbursed */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">Student Grants Funded</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <Gift className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">
              {formatETB(data.totals.totalGrants)} <span className="text-xs font-semibold text-slate-400">ETB</span>
            </div>
            <div className="mt-2 text-xs font-medium text-purple-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Student Empowerment</span>
            </div>
          </div>
        </div>

        {/* Budget Allocation Ratio Bar */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Treasury Cash Flow Health & Balance Distribution</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visual ratio of verified incoming capital vs executed disbursements
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Inflow: {inflowPercent}%
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Outflow: {100 - inflowPercent}%
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${inflowPercent}%` }}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
              title={`Inflow: ${formatETB(data.stats.totalInflow)} ETB`}
            />
            <div
              style={{ width: `${100 - inflowPercent}%` }}
              className="bg-gradient-to-r from-rose-500 to-amber-500 h-full transition-all duration-500"
              title={`Outflow: ${formatETB(data.stats.totalOutflow)} ETB`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100 text-center">
            <div>
              <span className="text-xs text-slate-400 block font-medium">University Subsidy</span>
              <span className="text-sm font-bold text-slate-800">{formatETB(data.totals.totalAllocations)} ETB</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Partner Donations</span>
              <span className="text-sm font-bold text-slate-800">{formatETB(data.totals.totalDonations)} ETB</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Direct Expenses</span>
              <span className="text-sm font-bold text-rose-600">-{formatETB(data.totals.totalExpenses)} ETB</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Innovation Grants</span>
              <span className="text-sm font-bold text-purple-600">-{formatETB(data.totals.totalGrants)} ETB</span>
            </div>
          </div>
        </div>

        {/* Public Financial Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <span>Public Ledger Transactions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {data.transactions.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographically referenced ledger entries with verified university receipts
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search receipt or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </form>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="ALLOCATION">University Allocations</option>
                <option value="DONATION">Donations</option>
                <option value="EXPENSE">Expenses</option>
                <option value="GRANT_DISBURSEMENT">Micro-Grant Disbursements</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
              <p className="text-sm font-medium">Loading ledger transactions...</p>
            </div>
          ) : data.transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-600">No transactions found</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting your filter or search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Reference & Date</th>
                    <th className="py-3.5 px-6">Description & Purpose</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Campus / Entity</th>
                    <th className="py-3.5 px-6 text-right">Amount (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data.transactions.map((tx) => {
                    const cat = CATEGORY_MAP[tx.category] || {
                      label: tx.category,
                      color: 'bg-slate-100 text-slate-700 border-slate-200',
                      type: 'EXPENSE',
                    };
                    const isInflow = cat.type === 'INFLOW';

                    return (
                      <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Reference & Date */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            {tx.referenceNumber}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(tx.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="py-4 px-6 max-w-md">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {tx.title}
                          </div>
                          {tx.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {tx.description}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.color}`}
                          >
                            {cat.label}
                          </span>
                        </td>

                        {/* Campus / Entity */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {tx.universityId?.name ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              <span>{tx.universityId.name}</span>
                              {tx.universityId.code && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono font-bold">
                                  {tx.universityId.code}
                                </span>
                              )}
                            </div>
                          ) : tx.clubId?.name ? (
                            <div className="text-xs font-medium text-indigo-700">
                              Club: {tx.clubId.name}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Inter-University Union</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6 whitespace-nowrap text-right font-mono font-bold text-sm">
                          <span
                            className={
                              isInflow
                                ? 'text-emerald-600 font-black'
                                : 'text-slate-900'
                            }
                          >
                            {isInflow ? '+' : '-'}
                            {formatETB(tx.amount)}
                          </span>
                          <span className="text-[10px] font-sans font-normal text-slate-400 ml-1">ETB</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom CTA to Student Micro-Grants */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-xs font-semibold">
              <Gift className="w-3.5 h-3.5 text-purple-300" />
              <span>Cross-Campus Student Empowerment</span>
            </div>
            <h3 className="text-xl font-bold">Have an innovative project or inter-university initiative?</h3>
            <p className="text-slate-300 text-sm max-w-2xl">
              Apply for up to 50,000 ETB in micro-grant funding for tech hackathons, community research, renewable energy, and debate initiatives.
            </p>
          </div>
          <Link
            to="/grants"
            className="whitespace-nowrap px-6 py-3.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm shadow-lg shadow-purple-900/50 transition-all hover:scale-105"
          >
            Explore Micro-Grants Portal →
          </Link>
        </div>

      </div>

      {/* Admin Record Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Record Ledger Entry</h3>
                <p className="text-xs text-slate-500">
                  Adds an immutable entry to the public financial transparency ledger
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transaction Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Inter-University Hackathon Venue Rental"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="ALLOCATION">University Allocation (+)</option>
                    <option value="DONATION">Donation / Partner Gift (+)</option>
                    <option value="EXPENSE">Operational Expense (-)</option>
                    <option value="GRANT_DISBURSEMENT">Micro-Grant Disbursement (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 25000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Receipt / Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. REC-2026-DBU-089 (auto-generated if blank)"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Audit Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Details regarding the expense, supplier, or allocation authorization..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Log to Ledger</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
