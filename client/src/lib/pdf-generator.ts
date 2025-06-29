
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
  
  // Cores do design
  const primaryGreen = '#8BC34A';
  const darkGray = '#424242';
  const lightGray = '#F5F5F5';
  const mediumGray = '#E0E0E0';

  // ===== CABEÇALHO COM ÍCONES E TÍTULO =====
  
  // Fundo cinza escuro no topo
  pdf.setFillColor(darkGray);
  pdf.rect(0, 0, pageWidth, 50, 'F');

  // Ícones de ferramentas (simulados com texto/formas)
  pdf.setFillColor(255, 255, 255);
  
  // Chave inglesa (simulada)
  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255);
  pdf.text('🔧', 20, 30);
  
  // Chave de fenda (simulada)
  pdf.text('🔩', 40, 30);
  
  // Carro (simulado)
  pdf.text('🚗', 60, 30);

  // Título principal
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const mainTitle = isSchedule ? 'Ordem de Serviço para\nOficina Mecânica' : 'Ordem de Serviço para\nOficina Mecânica';
  pdf.text(mainTitle, pageWidth - 20, 20, { align: 'right' });

  // Data da ordem
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  pdf.text(`Data da Ordem: ${currentDate}`, pageWidth - 20, 42, { align: 'right' });

  // ===== FAIXA VERDE =====
  pdf.setFillColor(primaryGreen);
  pdf.rect(0, 50, pageWidth, 8, 'F');

  // ===== NÚMERO DA ORDEM =====
  let yPosition = 70;
  
  // Fundo cinza claro para número da ordem
  pdf.setFillColor(lightGray);
  pdf.rect(20, yPosition - 5, 60, 15, 'F');
  pdf.setDrawColor(mediumGray);
  pdf.rect(20, yPosition - 5, 60, 15);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray);
  pdf.text('Nº da Ordem', 25, yPosition + 2);

  pdf.setFont('helvetica', 'normal');
  const orderNumber = `OS${Date.now().toString().slice(-6)}`;
  pdf.text(orderNumber, 25, yPosition + 8);

  yPosition += 30;

  // ===== INFORMAÇÕES DO CLIENTE =====
  
  // Título da seção
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray);
  pdf.text('Informações do Cliente', 20, yPosition);
  
  // Linha verde sob o título
  pdf.setDrawColor(primaryGreen);
  pdf.setLineWidth(2);
  pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
  
  yPosition += 15;

  // Fundo cinza claro para informações
  pdf.setFillColor(lightGray);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 35, 'F');
  pdf.setDrawColor(mediumGray);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 35);

  // Informações do cliente em duas colunas
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray);
  
  // Coluna esquerda
  pdf.text('Nome', 25, yPosition + 5);
  pdf.text('Telefone', 25, yPosition + 15);
  pdf.text('Endereço', 25, yPosition + 25);

  // Coluna direita
  pdf.text('E-mail', pageWidth/2 + 10, yPosition + 5);

  // Valores
  pdf.setFont('helvetica', 'normal');
  pdf.text(serviceData.customer.name, 60, yPosition + 5);
  pdf.text('(11) 0000-0000', 60, yPosition + 15); // Placeholder
  pdf.text('Endereço não informado', 60, yPosition + 25); // Placeholder
  pdf.text('cliente@email.com', pageWidth/2 + 40, yPosition + 5); // Placeholder

  yPosition += 50;

  // ===== DESCRIÇÃO DO VEÍCULO =====
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray);
  pdf.text('Descrição do Veículo', 20, yPosition);
  
  // Linha verde sob o título
  pdf.setDrawColor(primaryGreen);
  pdf.setLineWidth(2);
  pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
  
  yPosition += 15;

  // ===== FAIXA VERDE PARA CABEÇALHO DA TABELA =====
  pdf.setFillColor(primaryGreen);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 12, 'F');

  // Cabeçalhos da tabela do veículo
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Ano', 25, yPosition + 2);
  pdf.text('Modelo', 80, yPosition + 2);
  pdf.text('Tipo de Conserto', 130, yPosition + 2);

  yPosition += 12;

  // Fundo cinza claro para dados do veículo
  pdf.setFillColor(lightGray);
  pdf.rect(20, yPosition, pageWidth - 40, 40, 'F');
  pdf.setDrawColor(mediumGray);
  pdf.rect(20, yPosition, pageWidth - 40, 40);

  // Dados do veículo
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(darkGray);
  
  const currentYear = new Date().getFullYear();
  pdf.text(currentYear.toString(), 25, yPosition + 10);
  pdf.text(`${serviceData.vehicle.brand} ${serviceData.vehicle.model}`, 80, yPosition + 10);

  // Tipos de conserto (baseado nos serviços)
  let serviceTypeY = yPosition + 10;
  serviceData.serviceExtras.forEach((service, index) => {
    if (index < 4) { // Máximo 4 serviços para não ultrapassar o espaço
      pdf.text(`☑ ${service.serviceName}`, 130, serviceTypeY);
      serviceTypeY += 8;
    }
  });

  yPosition += 25;

  // Segunda linha da tabela do veículo
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cor', 25, yPosition + 10);
  pdf.text('Quilometragem', 80, yPosition + 10);
  pdf.text('Deseja reutilizar suas\npeças antigas?', 130, yPosition + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.text('Não informado', 25, yPosition + 20);
  pdf.text('000000', 80, yPosition + 20);
  pdf.text('☑ Sim', 130, yPosition + 20);

  yPosition += 30;

  // Marca e Placa
  pdf.setFont('helvetica', 'bold');
  pdf.text('Marca', 25, yPosition + 10);
  pdf.text('Placa', 80, yPosition + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.text(serviceData.vehicle.brand, 25, yPosition + 20);
  pdf.text(serviceData.vehicle.licensePlate, 80, yPosition + 20);

  yPosition += 40;

  // ===== FAIXA VERDE PARA SEPARAÇÃO =====
  pdf.setFillColor(primaryGreen);
  pdf.rect(0, yPosition, pageWidth, 8, 'F');
  
  yPosition += 20;

  // ===== OBSERVAÇÕES ADICIONAIS =====
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray);
  pdf.text('Observações Adicionais', 20, yPosition);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Comentários extras:', 20, yPosition + 10);
  
  yPosition += 20;

  // Caixa para observações
  pdf.setFillColor(lightGray);
  pdf.rect(20, yPosition, pageWidth - 40, 40, 'F');
  pdf.setDrawColor(mediumGray);
  pdf.rect(20, yPosition, pageWidth - 40, 40);

  // Texto das observações
  const observationsText = serviceData.notes || 
    'Ao assinar abaixo, autorizo a Empresa a consertar ou substituir peças sobressalentes para que meu veículo volte à situação anterior ao dano. Concordo que a Empresa não é responsável por qualquer perda/dano ao meu veículo causada por incêndio, roubo ou qualquer outra causa fora de seu controle.';

  const splitText = pdf.splitTextToSize(observationsText, pageWidth - 50);
  pdf.text(splitText, 25, yPosition + 10);

  yPosition += 60;

  // ===== RESUMO FINANCEIRO =====
  
  if (serviceData.serviceExtras.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(darkGray);
    pdf.text('RESUMO FINANCEIRO', 20, yPosition);
    
    pdf.setDrawColor(primaryGreen);
    pdf.setLineWidth(2);
    pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
    
    yPosition += 15;

    // Tabela de serviços
    serviceData.serviceExtras.forEach((service, index) => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${index + 1}. ${service.serviceName}`, 25, yPosition);
      pdf.text(`R$ ${Number(service.price).toFixed(2)}`, pageWidth - 60, yPosition);
      yPosition += 8;
    });

    yPosition += 10;

    // Total
    pdf.setDrawColor(darkGray);
    pdf.setLineWidth(1);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL:', 25, yPosition);
    pdf.text(`R$ ${Number(serviceData.totalValue).toFixed(2)}`, pageWidth - 60, yPosition);
    pdf.text('PAGO:', 25, yPosition + 10);
    pdf.text(`R$ ${Number(serviceData.valorPago).toFixed(2)}`, pageWidth - 60, yPosition + 10);
    
    const saldo = Number(serviceData.totalValue) - Number(serviceData.valorPago);
    pdf.text('SALDO:', 25, yPosition + 20);
    pdf.text(`R$ ${saldo.toFixed(2)}`, pageWidth - 60, yPosition + 20);

    yPosition += 40;
  }

  // ===== ASSINATURAS =====
  
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = 30;
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Assinatura do Cliente', 20, yPosition);
  pdf.text('Assinatura Autorizada', pageWidth - 100, yPosition);

  // Linhas para assinatura
  pdf.setDrawColor(darkGray);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPosition + 20, 80, yPosition + 20);
  pdf.line(pageWidth - 100, yPosition + 20, pageWidth - 20, yPosition + 20);

  // Informações do técnico
  yPosition += 30;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Técnico responsável: ${serviceData.technician.firstName} ${serviceData.technician.lastName}`, 20, yPosition);
  pdf.text(`Data: ${serviceData.scheduledDate ? new Date(serviceData.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR') : currentDate}`, 20, yPosition + 8);
  if (serviceData.scheduledTime) {
    pdf.text(`Horário: ${serviceData.scheduledTime}`, 20, yPosition + 16);
  }

  // Rodapé
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Salvar o PDF
  const filename = isSchedule 
    ? `agendamento-${serviceData.customer.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
    : `ordem-servico-${serviceData.customer.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
    
  pdf.save(filename);
};
