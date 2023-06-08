import { useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, Modal, Select, Table, Tag, Tooltip, message } from 'antd';
import styles from './index.less';
import { Page } from '@/models';
import privateIcon from '@/assets/icons/tag_private.svg';
import { knowledgeApi } from '@/api';
import { useModel } from 'umi';
import { CaretDownOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import CreateModal from './components/CreateModal';
import EditModal from './components/EditModal';
import { I_KnowledgeItem } from '@/api/knowledge';

const KnowledgeBase = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [dataSource, setDataSource] = useState<I_KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [postData, setPostData] = useState({ page: 1, size: 10, queryKey: '', ownType: '' });
  const [editData, setEditData] = useState<{
    name: string;
    description: string;
    type: string;
    uuid: string;
  }>({
    name: '',
    description: '',
    type: '',
    uuid: '',
  });
  const [editVisible, setEditVisible] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    showQuickJumper: true,
    total: 0,
    current: 1,
    showSizeChanger: false,
  });

  useEffect(() => {
    getTableList(postData);
  }, [postData]);
  const onCancel = (shouldReset: boolean) => {
    if (shouldReset) {
      getTableList(postData);
    }
    setCreateVisible(false);
    setEditVisible(false);
  };
  const getTableList = (data: Page) => {
    setLoading(true);
    const param: any = {
      ...data,
    };
    knowledgeApi.knowledgeList(param).then((res: any) => {
      if (res.code === 200) {
        const pagination_r = { ...pagination };
        pagination_r.total = res.page.total;
        pagination_r.current = res.page.page;
        setLoading(false);
        setDataSource(res.data);
        setPagination(pagination_r);
      } else {
        setLoading(false);
        setDataSource([]);
      }
    });
  };
  /**
   * @description: 表格分页、排序、筛选变化时触发，todo：暂时前端做分页，此功能方法不调用
   * @param {Object} pag：分页
   * @param {Object} filters：筛选
   * @param {Object} sorter：排序
   */
  const handleTableChange = async (pag: any) => {
    const pager = { ...pagination };
    pager.current = pag.current;
    setPagination(pager);
    const param = {
      ...postData,
      page: pager.current,
    };
    setPostData(param);
    getTableList(param);
  };
  const columns = [
    {
      title: '知识库',
      dataIndex: 'name',
      width: '20%',
      render: (text: string, record: I_KnowledgeItem) => {
        return <div className={styles.tagRender}>
          <span>{text}</span>
          {record.type === 'member' && <img src={privateIcon} style={{ marginLeft: 6, height: 16 }} />}
        </div>
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: '350px',
      render: (text: string) => {
        if (text && text.length >= 50) {
          return <Tooltip title={text} placement="topLeft">
            <div className={styles.desRender}>
              {text}
            </div>
          </Tooltip>
        }
        return <div className={styles.desRender}>
          {text || '--'}
        </div>
      }

    },
    {
      title: '创建者',
      dataIndex: 'ownerName',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
    },
    {
      title: '操作',
      dataIndex: 'prodSpecName',
      width: '150px',
      render: (text: any, record: any) => (
        <div className={styles.action}>
          {currentUser?.uuid === record.ownerUuid && (
            <>
              <a
                onClick={() => {
                  setEditData(record);
                  setEditVisible(true);
                }}
              >
                编辑
              </a>
              <Dropdown
                overlay={
                  <Menu
                    onClick={async ({ key }) => {
                      if (key == 'delete') {
                        Modal.confirm({
                          title: `确认删除 ${record.name} 知识库？`,
                          content: "删除后，影刀GPT将不能再使用知识库内的文档数据，确认要删除吗?",
                          icon: <QuestionCircleOutlined />,
                          okText: '取消',
                          cancelText: '删除',
                          cancelButtonProps: { type: "primary" },
                          okButtonProps: { ghost: true },
                          centered: true,
                          onOk: Modal.destroyAll,
                          onCancel: async () => {
                            const delRes = await knowledgeApi.deleteKnowledge(record.uuid);
                            if (delRes.code === 200) {
                              message.success('删除成功');
                              getTableList(postData);
                            }
                          },
                        });
                      }
                    }}
                  >
                    <Menu.Item key="delete">删除</Menu.Item>
                  </Menu>
                }
              >
                <a className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
                  更多 <CaretDownOutlined />
                </a>
              </Dropdown>
            </>
          )}
        </div>
      ),
    },
  ];
  return (
    <div className={styles.knowledgeBase}>
      <div className="account_title">
        <h1>知识库管理</h1>
        <div className="subTitle">知识库可以帮助拓展影刀GPT的知识边界，提供更专业的回答。</div>
      </div>
      <div className="search">
        <div>
          <Input
            placeholder="搜索知识库名称或描述"
            suffix={<SearchOutlined style={{ cursor: 'pointer' }} />}
            style={{ width: '200px' }}
            allowClear
            onBlur={(e) => {
              setPostData({ ...postData, queryKey: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.keyCode === 13) {
                setPostData({ ...postData, queryKey: e.target.value });
              }
            }}
          />
          <Select
            defaultValue=""
            style={{ width: '200px', marginLeft: 16 }}
            onChange={(ownType) => {
              setPostData({ ...postData, ownType });
            }}
          >
            <Select.Option key="">全部创建者</Select.Option>
            {/* <Select.Option key="other">企业其他人</Select.Option> */}
            <Select.Option key="self">自己</Select.Option>
          </Select>
        </div>

        <Button
          type="primary"
          className={styles.createKnowledge}
          onClick={() => setCreateVisible(true)}
        >
          新建知识库
        </Button>
      </div>
      <div style={{ padding: '0 24px' }}>
        <Table
          rowKey={(record: any) => record.robotUuid}
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </div>
      {createVisible && (
        <CreateModal
          onCancel={onCancel}
        />
      )}
      {editVisible && (
        <EditModal
          initState={editData}
          onCancel={onCancel}
        />
      )}
    </div>
  );
};
export default KnowledgeBase;
