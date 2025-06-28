
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ServiceData {
  customer: { name: string };
  vehicle: { brand: string; model: string; licensePlate: string };
  scheduledDate?: string;
  scheduledTime?: string;
  status: string;
  technician: { firstName: string; lastName: string };
  serviceExtras: Array<{
    serviceName: string;
    price: string;
    notes?: string;
  }>;
  totalValue: string;
  valorPago: string;
  notes?: string;
}

export const generateServicePDF = async (serviceData: ServiceData, isSchedule: boolean = false) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(isSchedule ? 'AGENDAMENTO DE SERVIÇO' : 'ORDEM DE SERVIÇO', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  pdf.setLineWidth(0.5);
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;

  // Cliente e Veículo
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DADOS DO CLIENTE E VEÍCULO', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Cliente: ${serviceData.customer.name}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Veículo: ${serviceData.vehicle.brand} ${serviceData.vehicle.model}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Placa: ${serviceData.vehicle.licensePlate}`, 20, yPosition);
  yPosition += 15;

  // Detalhes do Agendamento/Serviço
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DETALHES DO ' + (isSchedule ? 'AGENDAMENTO' : 'SERVIÇO'), 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  if (serviceData.scheduledDate) {
    const formattedDate = new Date(serviceData.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR');
    pdf.text(`Data: ${formattedDate}`, 20, yPosition);
    yPosition += 8;
  }
  
  if (serviceData.scheduledTime) {
    pdf.text(`Horário: ${serviceData.scheduledTime}`, 20, yPosition);
    yPosition += 8;
  }

  // Status traduzido
  const statusMap: Record<string, string> = {
    'scheduled': 'Agendado',
    'in_progress': 'Em Andamento',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };
  pdf.text(`Status: ${statusMap[serviceData.status] || serviceData.status}`, 20, yPosition);
  yPosition += 8;
  
  pdf.text(`Técnico: ${serviceData.technician.firstName} ${serviceData.technician.lastName}`, 20, yPosition);
  yPosition += 15;

  // Serviços
  if (serviceData.serviceExtras.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SERVIÇOS INCLUSOS', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    serviceData.serviceExtras.forEach((service, index) => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`${index + 1}. ${service.serviceName}`, 25, yPosition);
      pdf.text(`R$ ${Number(service.price).toFixed(2)}`, pageWidth - 60, yPosition);
      yPosition += 8;
      
      if (service.notes) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        const notesLines = pdf.splitTextToSize(`   Obs: ${service.notes}`, pageWidth - 80);
        pdf.text(notesLines, 25, yPosition);
        yPosition += notesLines.length * 5;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      }
      yPosition += 3;
    });
    yPosition += 10;
  }

  // Resumo Financeiro
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO FINANCEIRO', 20, yPosition);
  yPosition += 10;

  pdf.setLineWidth(0.3);
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Valor Total: R$ ${Number(serviceData.totalValue).toFixed(2)}`, 20, yPosition);
  pdf.text(`Valor Pago: R$ ${Number(serviceData.valorPago).toFixed(2)}`, 20, yPosition + 8);
  
  const saldo = Number(serviceData.totalValue) - Number(serviceData.valorPago);
  pdf.text(`Saldo: R$ ${saldo.toFixed(2)}`, 20, yPosition + 16);
  yPosition += 25;

  // Observações
  if (serviceData.notes) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OBSERVAÇÕES', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const notesLines = pdf.splitTextToSize(serviceData.notes, pageWidth - 40);
    pdf.text(notesLines, 20, yPosition);
    yPosition += notesLines.length * 6;
  }

  // Footer
  const footerY = pageHeight - 20;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, footerY);
  
  // Download do PDF
  const filename = isSchedule 
    ? `agendamento-${serviceData.customer.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
    : `ordem-servico-${serviceData.customer.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  
  pdf.save(filename);
};
