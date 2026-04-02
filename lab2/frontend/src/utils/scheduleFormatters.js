export function formatTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '--:--';
  if (timeStr.includes('T')) {
    return timeStr.split('T')[1].substring(0, 5);
  }
  return timeStr;
}

export function getTransportInfo(item) {
  const thread = item.thread || item;
  const transportType = thread.transport_type || item.transport_type;
  
  const labels = {
    'suburban': { label: 'Электричка', badge: 'bg-success', icon: 'bi-train-front' },
    'train': { label: 'Поезд', badge: 'bg-primary', icon: 'bi-train' },
    'plane': { label: 'Самолёт', badge: 'bg-info', icon: 'bi-airplane' },
    'bus': { label: 'Автобус', badge: 'bg-warning text-dark', icon: 'bi-bus-front' }
  };
  
  return labels[transportType] || { label: 'Рейс', badge: 'bg-secondary', icon: 'bi-question-circle' };
}

export function extractTrainData(item, isRoute) {
  if (isRoute) {
    const thread = item.thread || item;
    return {
      number: thread.number || thread.title,
      title: `${item.from?.title} → ${item.to?.title}`,
      from: item.from?.title,
      to: item.to?.title,
      carrier: thread.carrier?.title,
      subtype: thread.transport_subtype?.title
    };
  } else {
    const thread = item.thread || {};
    return {
      number: thread.number,
      title: thread.title || thread.short_title,
      direction: item.direction,
      platform: item.platform?.replace('обычно ', ''),
      arrival: item.arrival !== '00:00' ? item.arrival : null
    };
  }
}