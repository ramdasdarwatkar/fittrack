import React from "react";

export function LoginSkeleton() {
  return (
    <div className="login-root flex flex-col w-full h-svh bg-background overflow-hidden animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="h-[45svh] w-full bg-secondary relative flex flex-col justify-end p-6 border-b border-border">
        {/* Logo placeholder */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 w-32 h-10 rounded-xl shimmer" />
        
        {/* Headline words placeholder */}
        <div className="space-y-2 mb-6">
          <div className="w-1/2 h-8 rounded-lg shimmer" />
          <div className="w-1/3 h-8 rounded-lg shimmer" />
          <div className="w-2/3 h-8 rounded-lg shimmer" />
        </div>
        
        {/* Subtext placeholder */}
        <div className="w-24 h-4 rounded-md shimmer mb-4" />
      </div>

      {/* Form Section Skeleton */}
      <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full space-y-6 pt-8">
        <div className="space-y-2">
          <div className="w-40 h-6 rounded-md shimmer" />
          <div className="w-56 h-4 rounded-md shimmer opacity-60" />
        </div>

        {/* Form Inputs Skeletons */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="w-16 h-3 rounded shimmer" />
            <div className="w-full h-12 rounded-xl shimmer" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="w-16 h-3 rounded shimmer" />
              <div className="w-12 h-3 rounded shimmer" />
            </div>
            <div className="w-full h-12 rounded-xl shimmer" />
          </div>
        </div>

        {/* Button Skeleton */}
        <div className="w-full h-[50px] rounded-xl shimmer mt-4" />

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-border shimmer" />
          <div className="w-4 h-4 rounded-full shimmer" />
          <div className="flex-1 h-px bg-border shimmer" />
        </div>

        {/* Footer */}
        <div className="w-48 h-4 rounded shimmer mx-auto" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-background text-foreground overflow-hidden">
      <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">
        {/* Header Skeleton */}
        <header className="flex justify-between items-center pt-2">
          <div className="space-y-2">
            <div className="w-20 h-3 rounded shimmer" />
            <div className="w-36 h-7 rounded-lg shimmer" />
          </div>
          <div className="w-[52px] h-[52px] rounded-2xl shimmer" />
        </header>

        {/* Muscle Map Card Skeleton */}
        <div className="w-full h-[400px] rounded-3xl shimmer" />

        {/* Grid CTAs Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[115px] rounded-3xl shimmer" />
          <div className="h-[115px] rounded-3xl shimmer" />
        </div>

        {/* Grid Rings Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[180px] rounded-3xl shimmer" />
          <div className="h-[180px] rounded-3xl shimmer" />
        </div>
      </div>
    </div>
  );
}
