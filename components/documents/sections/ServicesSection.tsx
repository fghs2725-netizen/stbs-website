import React from 'react';
import { Drill, CloudRain, Droplets, Wrench, Trash2, Search } from 'lucide-react';
import PageWrapper from '../shared/PageWrapper';

interface Service {
  title: string;
  description: string;
  icon?: string;
}

interface ServicesSectionProps {
  services?: Service[];
  pageNumber: number;
  totalPages: number;
}

const DEFAULT_SERVICES = [
  { title: 'Tubewell Drilling', description: 'Deep tubewell drilling using advanced DTH and Rotary rigs for various strata.', icon: 'Drill' },
  { title: 'Rainwater Harvesting', description: 'Design and implementation of scientifically approved rainwater harvesting structures.', icon: 'CloudRain' },
  { title: 'Recharge Borewell', description: 'Specialized borewells designed specifically for groundwater replenishment.', icon: 'Droplets' },
  { title: 'Pump Installation', description: 'Supply and installation of submersible pumps, motors, and allied accessories.', icon: 'Wrench' },
  { title: 'Borewell Cleaning', description: 'Flushing and cleaning of old borewells to improve yield and water quality.', icon: 'Trash2' },
  { title: 'Hydrogeological Survey', description: 'Scientific groundwater exploration and feasibility studies.', icon: 'Search' },
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Drill': return <Drill size={24} />;
    case 'CloudRain': return <CloudRain size={24} />;
    case 'Droplets': return <Droplets size={24} />;
    case 'Wrench': return <Wrench size={24} />;
    case 'Trash2': return <Trash2 size={24} />;
    case 'Search': return <Search size={24} />;
    default: return <Drill size={24} />;
  }
};

export default function ServicesSection({ services = DEFAULT_SERVICES, pageNumber, totalPages }: ServicesSectionProps) {
  const displayServices = services && services.length > 0 ? services : DEFAULT_SERVICES;

  return (
    <PageWrapper pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-xl font-bold font-oswald mb-6 pb-2 border-b-2" style={{ color: 'var(--doc-primary)', borderColor: 'var(--doc-accent)' }}>
        OUR SERVICES
      </h2>
      
      <div className="grid grid-cols-2 gap-6">
        {displayServices.map((service, index) => (
          <div key={index} className="flex gap-4 p-4 border rounded bg-white shadow-sm" style={{ borderColor: 'var(--doc-border)' }}>
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(30, 58, 95, 0.1)', color: 'var(--doc-primary)' }}>
              {getIcon(service.icon || 'Drill')}
            </div>
            <div>
              <h3 className="font-bold mb-1" style={{ color: 'var(--doc-primary)' }}>{service.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
