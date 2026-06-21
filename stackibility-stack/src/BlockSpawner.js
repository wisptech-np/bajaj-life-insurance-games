// BlockSpawner.js – block type definitions + factory
// Each block represents an aspirational life goal. The visual style
// (iconType) is mapped to the goal it represents while keeping the
// architectural facades from the original design.
export const BLOCK_TYPES = [
    { type: 'cottage',   iconType: 'cottage',   label: 'Dream Home',         color: '#3B8DD4', borderColor: '#1E6CB6' },
    { type: 'school',    iconType: 'school',    label: 'Child Education',    color: '#00897B', borderColor: '#00665C' },
    { type: 'townhouse', iconType: 'townhouse', label: 'Child Marriage',     color: '#005BAC', borderColor: '#003E7A' },
    { type: 'apartment', iconType: 'apartment', label: 'Retirement',         color: '#5B7CD4', borderColor: '#3D5BAC' },
    { type: 'hospital',  iconType: 'hospital',  label: 'World Tour',         color: '#F26922', borderColor: '#C44D10' },
    { type: 'garage',    iconType: 'garage',    label: 'Startup',            color: '#7B5BB6', borderColor: '#5C4290' },
    { type: 'office',    iconType: 'office',    label: 'Business Expansion', color: '#455A64', borderColor: '#2C3E47' },
    { type: 'bank',      iconType: 'bank',      label: 'Job Promotion',      color: '#BFA181', borderColor: '#8E7253' },
    { type: 'apartment', iconType: 'apartment', label: 'Emergency Savings',  color: '#1E88E5', borderColor: '#1565C0' },
];

let typeIndex = 0;

/**
 * Create a new block object (not yet placed).
 */
export function spawnBlock(widthOverride = null) {
    const def = BLOCK_TYPES[typeIndex % BLOCK_TYPES.length];
    typeIndex++;

    return {
        ...def,
        width: widthOverride ?? 72,
        height: 60,
        x: 0,
        y: 0,
    };
}


export function resetBlockIndex() { typeIndex = 0; }
