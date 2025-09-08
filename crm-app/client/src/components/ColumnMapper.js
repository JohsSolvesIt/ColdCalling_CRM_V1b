import React, { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { titleCase } from '../utils/helpers';

const ColumnMapper = ({ 
  csvHeaders, 
  csvData, 
  columnMapping, 
  setColumnMapping, 
  onConfirm, 
  onCancel,
  normalizedHeaders // Pass actual CRM column names
}) => {
  // Analyze CSV data to determine what each column likely contains
  const analyzeColumn = (columnIndex, header) => {
    if (!csvData || csvData.length === 0) return { type: 'unknown', confidence: 0, samples: [] };
    
    const values = csvData.slice(0, 10).map(row => row[header]).filter(val => val && val.toString().trim());
    if (values.length === 0) return { type: 'empty', confidence: 0, samples: [] };
    
    const samples = values.slice(0, 3);
    
    // Check for phone numbers
    const phonePattern = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    if (values.some(val => phonePattern.test(val.toString().replace(/\s+/g, '')))) {
      return { type: 'phone', confidence: 0.9, samples };
    }
    
    // Check for emails
    const emailPattern = /@/;
    if (values.some(val => emailPattern.test(val.toString()))) {
      return { type: 'email', confidence: 0.9, samples };
    }
    
    // Check for URLs/websites
    const urlPattern = /^https?:\/\/|www\./;
    if (values.some(val => urlPattern.test(val.toString()))) {
      return { type: 'website', confidence: 0.8, samples };
    }
    
    // Check for company names (contains words like LLC, Inc, Corp, etc.)
    const companyPattern = /\b(LLC|Inc|Corp|Corporation|Company|Co\.|Ltd|Limited)\b/i;
    if (values.some(val => companyPattern.test(val.toString()))) {
      return { type: 'company', confidence: 0.7, samples };
    }
    
    // Check for names (2-3 words, starts with capital letters)
    const namePattern = /^[A-Z][a-z]+ [A-Z][a-z]+/;
    if (values.some(val => namePattern.test(val.toString()))) {
      return { type: 'name', confidence: 0.6, samples };
    }
    
    // Check for addresses (contains numbers and street indicators)
    const addressPattern = /\d+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)/i;
    if (values.some(val => addressPattern.test(val.toString()))) {
      return { type: 'address', confidence: 0.7, samples };
    }
    
    // Default to text
    return { type: 'text', confidence: 0.3, samples };
  };

  // Create intelligent column options
  const columnOptions = csvHeaders.map((header, index) => {
    const analysis = analyzeColumn(index, header);
    let displayName = `Col ${index + 1}`;
    let suggestion = '';
    
    // Add type-based suggestions
    switch (analysis.type) {
      case 'phone':
        suggestion = ' (📞 Phone)';
        break;
      case 'email':
        suggestion = ' (📧 Email)';
        break;
      case 'company':
        suggestion = ' (🏢 Company)';
        break;
      case 'name':
        suggestion = ' (👤 Name)';
        break;
      case 'website':
        suggestion = ' (🌐 Website)';
        break;
      case 'address':
        suggestion = ' (📍 Address)';
        break;
      default:
        suggestion = ` (📄 Text)`;
    }
    
    // Add sample data
    const sampleText = analysis.samples.length > 0 
      ? ` - "${analysis.samples[0]}${analysis.samples.length > 1 ? '...' : ''}"`
      : ' - Empty';
    
    return {
      header,
      displayName: displayName + suggestion + sampleText,
      analysis,
      index
    };
  });

  // Use actual database columns instead of hardcoded ones
  const expectedFields = [
    // Core CRM fields from DEFAULT_COLUMNS
    { key: 'Notes', label: 'Notes', required: false },
    { key: 'Status', label: 'Status', required: false },
    { key: 'LastContacted', label: 'Last Contacted', required: false },
    { key: 'LastTextSent', label: 'Last Text Sent', required: false },
    { key: 'FollowUpAt', label: 'Follow Up Date', required: false },
    { key: 'TextsSent', label: 'Texts Sent', required: false },
    { key: 'FollowUpPriority', label: 'Follow Up Priority', required: false },
    
    // Common contact fields that might exist
    { key: 'Name', label: 'Full Name', required: false },
    { key: 'FirstName', label: 'First Name', required: false },
    { key: 'LastName', label: 'Last Name', required: false },
    { key: 'Company', label: 'Company', required: false },
    { key: 'Phone', label: 'Phone', required: true },
    { key: 'Email', label: 'Email', required: false },
    { key: 'Address', label: 'Address', required: false },
    { key: 'City', label: 'City', required: false },
    { key: 'State', label: 'State', required: false },
    { key: 'ZIP', label: 'ZIP Code', required: false },
    { key: 'Website', label: 'Website', required: false },
    
    // Add any other columns from normalizedHeaders that aren't in the list above
    ...normalizedHeaders
      .filter(h => !['id', 'Notes', 'Status', 'LastContacted', 'LastTextSent', 'FollowUpAt', 'TextsSent', 'FollowUpPriority', 
                     'Name', 'FirstName', 'LastName', 'Company', 'Phone', 'Email', 'Address', 'City', 'State', 'ZIP', 'Website'].includes(h))
      .map(h => ({ key: h, label: titleCase(h), required: false }))
  ];

  // Auto-suggest mappings based on analysis
  useEffect(() => {
    // Only run if we have CSV data and no existing mappings
    if (!csvHeaders.length || !csvData.length || Object.keys(columnMapping).length > 0) {
      return;
    }
    
    const autoMappings = {};
    
    columnOptions.forEach(option => {
      if (option.analysis.confidence > 0.6) {
        switch (option.analysis.type) {
          case 'phone':
            if (!autoMappings.Phone) autoMappings.Phone = option.header;
            break;
          case 'email':
            if (!autoMappings.Email) autoMappings.Email = option.header;
            break;
          case 'company':
            if (!autoMappings.Company) autoMappings.Company = option.header;
            break;
          case 'name':
            if (!autoMappings.Name) autoMappings.Name = option.header;
            break;
          case 'website':
            if (!autoMappings.Website) autoMappings.Website = option.header;
            break;
          case 'address':
            if (!autoMappings.Address) autoMappings.Address = option.header;
            break;
        }
      }
    });
    
    if (Object.keys(autoMappings).length > 0) {
      setColumnMapping(autoMappings);
    }
  }, [csvHeaders, csvData, columnMapping, columnOptions, setColumnMapping]);

  const handleMapping = (field, csvColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: csvColumn
    }));
  };

  const getPreviewValue = (csvColumn) => {
    if (!csvData || csvData.length === 0) return 'No data';
    const firstRow = csvData[0];
    return firstRow[csvColumn] || 'Empty';
  };

  const hasRequiredMappings = () => {
    const requiredFields = expectedFields.filter(f => f.required);
    return requiredFields.every(field => 
      columnMapping[field.key] && columnMapping[field.key] !== ''
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Smart CSV Column Mapper
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Intelligent column detection with auto-suggestions. Required fields are marked with *
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Field Mapping */}
            <div>
              <h3 className="font-medium mb-4">CRM Fields ({expectedFields.length} available)</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {expectedFields.map(field => (
                  <div key={field.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <label className="block text-sm font-medium mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-xs text-slate-500 ml-2">({field.key})</span>
                    </label>
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={(e) => handleMapping(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="">-- Skip this field --</option>
                      {columnOptions.map(option => (
                        <option key={option.header} value={option.header}>
                          {option.displayName}
                        </option>
                      ))}
                    </select>
                    {columnMapping[field.key] && (
                      <div className="mt-2 text-xs text-slate-500">
                        Preview: "{getPreviewValue(columnMapping[field.key])}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - CSV Preview - SHOW ALL COLUMNS */}
            <div>
              <h3 className="font-medium mb-4">CSV Preview ({csvHeaders.length} columns)</h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                      <tr>
                        {columnOptions.map((option) => (
                          <th key={option.header} className="px-2 py-2 text-left font-medium border-r border-slate-200 dark:border-slate-600 min-w-[140px]">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Col {option.index + 1}
                                {option.analysis.type === 'phone' && ' 📞'}
                                {option.analysis.type === 'email' && ' 📧'}
                                {option.analysis.type === 'company' && ' 🏢'}
                                {option.analysis.type === 'name' && ' 👤'}
                                {option.analysis.type === 'website' && ' 🌐'}
                                {option.analysis.type === 'address' && ' 📍'}
                              </span>
                              <span className="font-normal text-slate-600 dark:text-slate-400 break-words text-xs">
                                {option.analysis.type.charAt(0).toUpperCase() + option.analysis.type.slice(1)}
                              </span>
                              <span className="font-mono text-slate-500 dark:text-slate-500 break-words text-xs">
                                {option.header.length > 15 ? option.header.substring(0, 15) + '...' : option.header}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData?.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-t border-slate-200 dark:border-slate-600">
                          {csvHeaders.map(header => (
                            <td key={header} className="px-2 py-2 border-r border-slate-200 dark:border-slate-600 min-w-[140px]">
                              <div className="break-words">
                                {String(row[header] || '').length > 25 
                                  ? String(row[header]).substring(0, 25) + '...' 
                                  : String(row[header] || '')
                                }
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData?.length > 8 && (
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-600">
                    Showing 8 of {csvData.length} rows
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {hasRequiredMappings() ? (
              <span className="text-green-600">✅ Ready to import ({Object.keys(columnMapping).filter(k => columnMapping[k]).length} fields mapped)</span>
            ) : (
              <span className="text-red-600">⚠️ Please map at least one Phone field (marked with *)</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!hasRequiredMappings()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import with Mapping ({Object.keys(columnMapping).filter(k => columnMapping[k]).length} fields)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMapper;
