import React from 'react';
import Layout from '../components/Layout';

const TransactionsPage: React.FC = () => {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Transactions</h1>
        <p className="text-muted-foreground">Page des transactions en cours de développement...</p>
      </div>
    </Layout>
  );
};

export default TransactionsPage;
