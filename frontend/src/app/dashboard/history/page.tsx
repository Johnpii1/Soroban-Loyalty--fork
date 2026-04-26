"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { api, TransactionRecord } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";

export default function HistoryPage() {
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    api.getUserTransactions(publicKey, limit, page * limit)
      .then((data) => {
        setTransactions(data.transactions);
        setTotal(data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [publicKey, page]);

  if (!publicKey) {
    return (
      <div className="site-main">
        <h1 className="page-title">Transaction History</h1>
        <div className="alert alert-error">Connect your Freighter wallet to view your transaction history.</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="site-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Transaction History</h1>
        <Link href="/dashboard" className="btn btn-outline">Back to Dashboard</Link>
      </div>

      {loading ? (
        <div className="empty-state">Loading history...</div>
      ) : transactions.length === 0 ? (
        <EmptyState
          illustration="transactions"
          title="No history found"
          description="Your on-chain interactions will appear here once you claim or redeem rewards."
          cta={{ label: "Go to Campaigns", href: "/dashboard" }}
        />
      ) : (
        <>
          <div className="transaction-table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campaign</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.tx_hash}>
                    <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td>{tx.campaign_name ? (tx.campaign_name.length > 12 ? `${tx.campaign_name.slice(0, 8)}...${tx.campaign_name.slice(-4)}` : tx.campaign_name) : `Campaign #${tx.campaign_id}`}</td>
                    <td>
                      <span className={`badge ${tx.type === 'claim' ? 'badge-claim' : 'badge-redeem'}`} style={{ textTransform: 'capitalize' }}>
                        {tx.type}
                      </span>
                    </td>
                    <td>{tx.amount.toLocaleString()} LYT</td>
                    <td className="mono" style={{ fontSize: '0.85rem' }}>
                      <a 
                        href={`https://stellar.expert/explorer/testnet/tx/${tx.tx_hash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-8)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn btn-secondary" 
                disabled={page === 0} 
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                disabled={page >= totalPages - 1} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
          
          <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Total transactions: {total}
          </div>
        </>
      )}
    </div>
  );
}
