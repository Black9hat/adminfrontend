/**
 * Reusable Page Layout Components
 * Professional admin page structure following design system
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import DESIGN_SYSTEM from '../utils/designSystem';

const DS = DESIGN_SYSTEM.colors;

// ============================================
// PAGE HEADER
// ============================================
export const PageHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}> = ({ icon, title, subtitle, action, breadcrumbs }) => {
  return (
    <div style={{
      backgroundColor: DS.primary,
      color: DS.textOnPrimary,
      padding: '2rem 1.5rem',
      borderBottom: `1px solid ${DS.primary}`,
    }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={16} />}
              <span>{crumb.label}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Title Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {icon && (
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DS.textOnPrimary,
            }}>
              {icon}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: '0.875rem', opacity: 0.85, margin: '0.5rem 0 0 0' }}>{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

// ============================================
// KPI GRID
// ============================================
export const KPICard: React.FC<{
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  color?: string;
  onClick?: () => void;
}> = ({ icon, label, value, trend, color = DS.primaryLight, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: color,
        padding: '1.5rem',
        borderRadius: '1rem',
        border: `1px solid ${DS.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms ease-in-out',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = DESIGN_SYSTEM.shadow.lg)}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = 'none')}
    >
      <div>
        <p style={{ fontSize: '0.813rem', fontWeight: 500, color: DS.textTertiary, margin: 0, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontSize: '1.875rem', fontWeight: 700, color: DS.text, margin: 0 }}>{value}</p>
        {trend && (
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: trend.isPositive ? DS.success : DS.error, margin: '0.5rem 0 0 0' }}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
      {icon && (
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.75rem',
          backgroundColor: 'rgba(184, 95, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: DS.primary,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
    </div>
  );
};

// ============================================
// CONTENT CONTAINER
// ============================================
export const PageContent: React.FC<{ children: React.ReactNode; maxWidth?: string }> = ({ children, maxWidth = '100%' }) => {
  return (
    <div style={{
      padding: '2rem 1.5rem',
      backgroundColor: DS.surface,
      minHeight: 'calc(100vh - 200px)',
      maxWidth,
      margin: '0 auto',
    }}>
      {children}
    </div>
  );
};

// ============================================
// SECTION CARD
// ============================================
export const SectionCard: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}> = ({ title, icon, children, footer, noPadding = false }) => {
  return (
    <div style={{
      backgroundColor: DS.background,
      border: `1px solid ${DS.border}`,
      borderRadius: '1rem',
      overflow: 'hidden',
      boxShadow: DESIGN_SYSTEM.shadow.md,
    }}>
      {title && (
        <div style={{
          padding: '1.5rem',
          borderBottom: `1px solid ${DS.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          {icon && <div style={{ color: DS.primary, display: 'flex' }}>{icon}</div>}
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: DS.text }}>{title}</h3>
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '1.5rem' }}>
        {children}
      </div>
      {footer && (
        <div style={{
          padding: '1.5rem',
          borderTop: `1px solid ${DS.border}`,
          backgroundColor: DS.surface,
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};

// ============================================
// DATA TABLE
// ============================================
export const DataTable: React.FC<{
  columns: Array<{ key: string; label: string; width?: string }>;
  rows: Array<any>;
  loading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: any) => React.ReactNode;
}> = ({ columns, rows, loading, emptyMessage = 'No data available', rowActions }) => {
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: DS.textTertiary }}>
        <div style={{ animation: 'spin 1s linear infinite' }}>⏳ Loading...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: DS.textTertiary }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: DS.surface, borderBottom: `1px solid ${DS.border}` }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.813rem',
                  fontWeight: 600,
                  color: DS.textSecondary,
                  textTransform: 'uppercase',
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
            {rowActions && <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.813rem', fontWeight: 600, color: DS.textSecondary }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: `1px solid ${DS.border}`, _hover: { backgroundColor: DS.surface } }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '1rem 1.5rem', color: DS.text, fontSize: '0.938rem' }}>
                  {row[col.key]}
                </td>
              ))}
              {rowActions && <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// STATUS BADGE
// ============================================
export const StatusBadge: React.FC<{ status: string; variant?: 'success' | 'warning' | 'error' | 'info' }> = ({ status, variant = 'info' }) => {
  const variants = {
    success: { bg: DS.successLight, color: DS.success },
    warning: { bg: DS.warningLight, color: DS.warning },
    error: { bg: DS.errorLight, color: DS.error },
    info: { bg: DS.infoLight, color: DS.info },
  };

  const style = variants[variant];

  return (
    <span style={{
      display: 'inline-block',
      padding: '0.375rem 0.75rem',
      borderRadius: '9999px',
      backgroundColor: style.bg,
      color: style.color,
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
};

// ============================================
// FILTER BAR
// ============================================
export const FilterBar: React.FC<{
  filters: Array<{
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;
  children?: React.ReactNode;
}> = ({ filters, children }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem 0',
      flexWrap: 'wrap',
      borderBottom: `1px solid ${DS.border}`,
    }}>
      {filters.map((filter) => (
        <select
          key={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: `1px solid ${DS.border}`,
            backgroundColor: DS.background,
            color: DS.text,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {children && <div style={{ marginLeft: 'auto' }}>{children}</div>}
    </div>
  );
};
