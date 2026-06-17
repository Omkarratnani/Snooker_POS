import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

export const Tabs = ({ defaultValue, value, onValueChange, className, children, ...props }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const currentVal = value !== undefined ? value : activeTab;
  const setVal = onValueChange || setActiveTab;
  return (
    <TabsContext.Provider value={{ value: currentVal, onValueChange: setVal }}>
      <div className={className} {...props}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className, ...props }) => (
  <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`} {...props} />
);

export const TabsTrigger = ({ value, className, ...props }) => {
  const context = useContext(TabsContext);
  const isActive = context.value === value;
  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-background text-foreground shadow' : 'hover:bg-background/50 hover:text-foreground/80'
      } ${className}`}
      {...props}
    />
  );
};

export const TabsContent = ({ value, className, children, ...props }) => {
  const context = useContext(TabsContext);
  if (context.value !== value) return null;
  return (
    <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  );
};
