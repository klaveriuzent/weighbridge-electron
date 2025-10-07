import React, { useState } from 'react'
import { Tabs, Radio, Button } from 'antd'

export default function BodyContent() {
    const [size, setSize] = useState('middle')
    const [activeKey, setActiveKey] = useState('1')
    const [items, setItems] = useState([
        {
            label: 'Tab 1',
            key: '1',
            children: 'Content of editable tab 1',
        },
        {
            label: 'Tab 2',
            key: '2',
            children: 'Content of editable tab 2',
        },
    ])

    // Tambah tab baru
    const add = () => {
        const newKey = String(items.length + 1)
        const newTab = {
            label: `Tab ${newKey}`,
            key: newKey,
            children: `Content of editable tab ${newKey}`,
        }
        setItems([...items, newTab])
        setActiveKey(newKey)
    }

    // Hapus tab
    const remove = (targetKey) => {
        const targetIndex = items.findIndex((item) => item.key === targetKey)
        const newItems = items.filter((item) => item.key !== targetKey)
        if (newItems.length && targetKey === activeKey) {
            const newActiveKey =
                newItems[targetIndex === newItems.length ? targetIndex - 1 : targetIndex].key
            setActiveKey(newActiveKey)
        }
        setItems(newItems)
    }

    // Event handler dari Tabs editable-card
    const onEdit = (targetKey, action) => {
        if (action === 'add') add()
        else remove(targetKey)
    }

    return (
        <main className="flex-1 px-6 py-4 bg-gray-50">
            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 m-0">
                        Dashboard Tabs
                    </h2>
                    <Radio.Group
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="space-x-2"
                    >
                        <Radio.Button value="small">Small</Radio.Button>
                        <Radio.Button value="middle">Middle</Radio.Button>
                        <Radio.Button value="large">Large</Radio.Button>
                    </Radio.Group>
                </div>

                <Tabs
                    type="editable-card"
                    size={size}
                    hideAdd
                    onEdit={onEdit}
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={items}
                />

                <div className="mt-4 flex justify-end">
                    <Button
                        type="primary"
                        onClick={add}
                        className="!bg-[#303c54] hover:!bg-[#3e4a68]"
                    >
                        + Tambah Tab
                    </Button>
                </div>
            </div>
        </main>
    )
}
