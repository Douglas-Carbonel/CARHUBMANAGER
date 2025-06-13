
interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function PageTitle({ title, subtitle, icon }: PageTitleProps) {
  return (
    <div className="flex items-center space-x-3 mb-6">
      {icon && (
        <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
          <div className="text-white text-xl">
            {icon}
          </div>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
