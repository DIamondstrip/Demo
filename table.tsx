import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  Table,
  Tag,
  Progress,
  Modal,
  message,
  Dropdown,
  Tooltip,
  Typography,
  Menu,
  Image,
} from 'antd';
import { ExclamationCircleOutlined, DownOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import moment from 'moment';

import CustomElement from './components/CustomElement';
import HeaderSetting from './components/HeaderSetting';
import ModalElement from '../ModalElement';

import { pubilcRequestApi, userApi } from '@/api/index';
import type { TableHeader } from './data.d';
import type { YDResponse } from '@/models';

import styles from './index.less';

const { Paragraph } = Typography;

export default ({
  loading,
  tableHeader,
  tableData,
  tableSummary,
  pagination,
  tableChange,
  rowSelection,
  tableCode,
}: {
  loading: boolean;
  tableHeader: TableHeader[];
  tableData: any;
  tableSummary: any;
  pagination: any;
  tableChange: ({ }: any) => void;
  rowSelection: any | undefined;
  tableCode: string | undefined;
}) => {
  const columnsList = useMemo(() => tableHeader, [tableHeader]);
  const dataSourceList = useMemo(() => tableData, [tableData]);
  const [columns, setColumns] = useState<any>([]);
  const [dataSource, setDataSource] = useState([]);
  const [modalInfo, setModalInfo] = useState({ visible: false });
  const [paginations, setPagination] = useState<any>({});
  const dataSourceData = useRef(dataSource);
  //事件分发
  const actionClick = (record: any, item: any, val: any) => {
    if (val.action === 'modal') {
      const obj = {
        visible: true,
        params: {},
        data: record,
        code: val.describe.code,
        title: val.describe.title,
        describe: val.describe,
        sourceUuid: record[tableSummary?.rowKey],
        footerBtn: val.describe.footerBtn,
        width: val.describe.width,
      };
      setModalInfo(obj);
    }
    if (val.action === 'look' && record[`${item.key}__l`]) {
      const params = {
        encryptValue: record[`${item.key}__l`].encrypte,
        code: tableCode,
        codeType: 'table',
        fieldName: item.key,
      };
      const data = [...dataSourceData.current];
      userApi.sensitiveDataQuery(params).then((res: YDResponse<any>) => {
        if (res.code === 200) {
          data.map((it: any) => {
            if (it[tableSummary?.rowKey] === record[tableSummary?.rowKey]) {
              it[item.key] = res.data.decryptValue;
              it[item.key + 'Show'] = true;
            }
          });
          dataSourceData.current = data;
          setDataSource(data);
        }
      });
    }
    if (val.action === 'confirm') {
      let customObj: any = {};
      if (val.describe.textType && val.describe.textType === 'custom') {
        val.describe.textRule.map((rlueItem: any) => {
          if (record[rlueItem.matchingField] == rlueItem.consultValue) {
            customObj = rlueItem;
          }
        });
      }
      if (['success', 'info', 'error', 'warning'].includes(val.describe.type)) {
        Modal[val.describe.type]({
          title: customObj.title ? customObj.title : val.describe.title,
          content: customObj.content ? customObj.content : val.describe.content,
          okText: val.describe.okText,
        });
      } else {
        Modal.confirm({
          title: customObj.title ? customObj.title : val.describe.title,
          icon: <ExclamationCircleOutlined />,
          content: customObj.content ? customObj.content : val.describe.content,
          okText: val.describe.okText,
          cancelText: val.describe.cancelText,
          onOk() {
            if (val.describe.okUrl) {
              const params: any = {};
              val.describe.okParams.length &&
                val.describe.okParams.map((it: any) => {
                  params[it.submitField] = record[it.matchingField];

                  if (it.getValType === 'self') {
                    params[it.submitField] = it.defaultValue;
                  }
                  if (it.getValType === 'tableList' && record) {
                    params[it.submitField] = record[it.matchingField];
                  }
                });
              pubilcRequestApi
                .getPublicDataGetOrPost(
                  val.describe.okMethod,
                  val.describe.okUrl,
                  params,
                )
                .then((res: YDResponse<any>) => {
                  if (res.code === 200) {
                    message.success(
                      res?.data?.message ? res?.data?.message : '操作成功',
                    );
                    if (val?.describe?.delayTime) {
                      setTimeout(() => {
                        tableChange && tableChange({ filters: [] });
                      }, val.describe.delayTime);
                    } else {
                      tableChange && tableChange({ filters: [] });
                    }
                  }
                });
            }
          },
          onCancel() {
            if (val.describe.cancelUrl) {
              const params: any = {};
              val.describe.cancelParams &&
                val.describe.cancelParams.map((it: any) => {
                  params[it.submitField] = record[it.matchingField];
                  if (it.getValType === 'self') {
                    params[it.submitField] = it.defaultValue;
                  }
                  if (it.getValType === 'tableList' && record) {
                    params[it.submitField] = record[it.matchingField];
                  }
                });
              pubilcRequestApi
                .getPublicDataGetOrPost(
                  val.describe.cancelMethod,
                  val.describe.cancelUrl,
                  params,
                )
                .then((res: YDResponse<any>) => {
                  if (res.code === 200) {
                    message.success(
                      res.data.message ? res.data.message : '操作成功',
                    );
                    if (val?.describe?.delayTime) {
                      setTimeout(() => {
                        tableChange && tableChange({ filters: [] });
                      }, val.describe.delayTime);
                    } else {
                      tableChange && tableChange({ filters: [] });
                    }
                  }
                });
            }
          },
        });
      }
    }
    if (val.action === 'jumpUrl') {
      let str: any = '';
      if (val.describe.allowStatus) {
        val.describe.params.map((value: any, index: number) => {
          const mark = index > 0 ? '&' : '?';
          if (value.getValType === 'self') {
            str = str + mark + value.submitField + '=' + value.defaultValue;
          }
          if (value.getValType === 'tableList') {
            str =
              str +
              mark +
              value.submitField +
              '=' +
              record[value.matchingField];
          }
        });
      }
      if (val.describe.newTab) {
        window.open(val.describe.url + (val.describe.allowStatus ? str : ''));
      } else {
        window.location.href =
          val.describe.url + (val.describe.allowStatus ? str : '');
      }
    }
  };
  // 复制
  const doCopy = () => {
    message.success('已复制到剪切板');
  };

  // 获取status状态值展示情况
  const getStatusNode = (describe: any, record: any, item: any, val: any) => {
    let statusVal: any;
    describe.data &&
      describe.data.map((it: any) => {
        if (it.status === record[item.key]) {
          statusVal = it;
        }
      });
    return (
      <Tooltip
        title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
        key={uuidv4()}
      >
        <span
          style={{
            color:
              statusVal?.status === record[item.key] && statusVal?.color
                ? statusVal.color
                : '',
          }}
        >
          {statusVal ? statusVal?.text : record[item.key]}
        </span>
      </Tooltip>
    );
  };

  // 获取Tooltip状态值展示情况
  const getTooltipData = (val: any, record: any) => {
    // 如果有展示长度限制
    if (val.describe.showLength) {
      // 为文本情况
      if (val.describe.showField === 'text') {
        //判断数据长度是否大于最大截取长度，大于截取，不大于直接展示
        if (val.describe.text.length >= val.describe.showLength) {
          return val.describe.text.slice(0, val.describe.showLength) + '...';
        } else {
          return val.describe.text;
        }
      } else if (val.describe.text) {
        // 为数据取值情况
        if (
          record[val.describe.text] &&
          record[val.describe.text].length >= val.describe.showLength
        ) {
          //判断数据长度是否大于最大截取长度，大于截取，不大于直接展示
          return (
            record[val.describe.text].slice(0, val.describe.showLength) + '...'
          );
        } else {
          return record[val.describe.text];
        }
      } else {
        return null;
      }
    } else if (val.describe.showField === 'text') {
      //无展示长度限制，取文本值情况
      return val.describe.text;
    } else {
      //无展示长度限制，直接展示数据
      return record[val.describe.text];
    }
  };

  // 获取特殊操作节点数据
  const getActionData = (record: any, item: any, val: any) => {
    let node, TooltipNode, customText;
    // 操作项数据展现互斥逻辑处理
    if (
      ['modal', 'download', 'confirm', 'custom', 'jumpUrl'].includes(
        val.action,
      ) &&
      val.describe.textType == 'custom' &&
      val.describe.textRule.length
    ) {
      val.describe.textRule.map((rlueItem: any) => {
        if (record[rlueItem.matchingField] == rlueItem.consultValue) {
          customText = rlueItem.text;
        }
      });
      if (!customText) {
        return (node = '');
      }
    }

    if (['copy', 'ellipsis', 'tag_text'].includes(val.action)) {
      TooltipNode = (
        <Tooltip
          title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
        >
          {getTooltipData(val, record)}
        </Tooltip>
      );
    }
    switch (val.action) {
      // 进度条
      case 'progress':
        node =
          val.describe.data &&
          val.describe.data.map((it: any) => {
            return (
              <Tooltip
                title={
                  val.describe.showTips ? record[val.describe.tipsCode] : ''
                }
                key={uuidv4()}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Progress
                    percent={(record[it.startData] / record[it.endData]) * 100}
                    strokeColor={it.color}
                    showInfo={false}
                    style={{ marginRight: 8 }}
                  />
                  <span>{record[it.startData]}</span>/
                  <span>{record[it.endData]}</span>
                </div>
              </Tooltip>
            );
          });
        break;
      // 通用标签
      case 'tag':
        node =
          val.describe.data &&
          val.describe.data.map((it: any) => {
            let obj = { color: '', font: '' };
            val.describe.rule.map((rlueItem: any) => {
              if (rlueItem.value === record[it.key]) {
                obj = rlueItem;
              }
            });
            return (
              obj.font && (
                <Tooltip
                  title={
                    val.describe.showTips ? record[val.describe.tipsCode] : ''
                  }
                  key={uuidv4()}
                >
                  <Tag color={obj.color}>{obj.font}</Tag>
                </Tooltip>
              )
            );
          });
        break;
      // 渲染标签
      case 'renderTag':
        node =
          record[val.describe.dataField] &&
          record[val.describe.dataField].map((item: any) => {
            return (
              val.describe.ruleField.fontField && (
                <Tooltip
                  title={
                    val.describe.showTips ? record[val.describe.tipsCode] : ''
                  }
                  key={uuidv4()}
                >
                  <Tag
                    color={
                      val.describe.ruleField.colorField &&
                      item[val.describe.ruleField.colorField]
                    }
                  >
                    {item[val.describe.ruleField.fontField]}
                  </Tag>
                </Tooltip>
              )
            );
          });
        break;
      // 弹框
      case 'modal':
        node = (
          <Tooltip
            title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
            key={uuidv4()}
          >
            <a onClick={() => actionClick(record, item, val)}>
              {val.describe.textType === 'custom'
                ? customText
                : val.describe.text}
            </a>
          </Tooltip>
        );
        break;
      // 查看
      case 'look':
        if (record[item.key + 'Show']) {
          node = (
            <Tooltip
              title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
              key={uuidv4()}
            >
              <span>{record[item.key]}</span>
            </Tooltip>
          );
        } else {
          node = (
            <Tooltip
              title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
              key={uuidv4()}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {val.describe.encryptionShow && (
                  <span style={{ marginRight: 4 }}>{record[item.key]}</span>
                )}
                {record[item.key] &&
                  (val.describe.encryptionShow ? (
                    <Tooltip title="查看">
                      <div>
                        <img
                          onClick={() => actionClick(record, item, val)}
                          src="https://winrobot-pub-a.oss-cn-hangzhou.aliyuncs.com/image/20220527112402/a8bdd69d35446c290bb0c833a3e17f81.svg"
                          alt=""
                        />
                      </div>
                    </Tooltip>
                  ) : (
                    <a onClick={() => actionClick(record, item, val)}>
                      {val.describe.text}
                    </a>
                  ))}
              </div>
            </Tooltip>
          );
        }
        break;
      // 字体颜色状态
      case 'status':
        node = useMemo(
          () => getStatusNode(val.describe, record, item, val),
          [],
        );
        break;
      // 下载
      case 'download':
        node = (
          <Tooltip
            title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
            key={uuidv4()}
          >
            {val.describe.downloadField && (
              <a href={val.describe.downloadField}>
                {val.describe.textType === 'custom'
                  ? customText
                  : val.describe.text || '下载'}
              </a>
            )}
          </Tooltip>
        );
        break;
      // 跳转
      case 'jumpUrl':
        node = (
          <Tooltip
            title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
            key={uuidv4()}
          >
            <a onClick={() => actionClick(record, item, val)}>
              {val.describe.showField === 'text'
                ? val.describe.text
                : record[val.describe.text]}
            </a>
          </Tooltip>
        );
        break;
      // tips提示
      case 'tips':
        node = (
          <Tooltip
            title={val.describe.showTips ? record[val.describe.tipsCode] : ''}
            key={uuidv4()}
          >
            {record[item.key]}
          </Tooltip>
        );
        break;
      //提示性弹框
      case 'confirm':
        node = (
          <a onClick={() => actionClick(record, item, val)} key={uuidv4()}>
            {val.describe.textType === 'text' ? val.describe.text : customText}
          </a>
        );
        break;
      // 数值区间标签
      case 'numSectionTag':
        node =
          val.describe.data &&
          val.describe.data.map((it: any) => {
            let obj = { color: '', value: '' };
            val.describe.rule.map((rlueItem: any) => {
              if (
                !rlueItem.minVal &&
                Number(record[it.key]) <= Number(rlueItem.maxVal)
              ) {
                obj = {
                  color: rlueItem.color,
                  value:
                    rlueItem.type === 'field'
                      ? record[rlueItem.fieldKey] + rlueItem.unit
                      : rlueItem.font,
                };
              }
              if (
                rlueItem.minVal &&
                rlueItem.maxVal &&
                Number(record[it.key]) > Number(rlueItem.minVal) &&
                Number(record[it.key]) <= Number(rlueItem.maxVal)
              ) {
                obj = {
                  color: rlueItem.color,
                  value:
                    rlueItem.type === 'field'
                      ? record[rlueItem.fieldKey] + rlueItem.unit
                      : rlueItem.font,
                };
              }
              if (
                Number(rlueItem.minVal) < Number(record[it.key]) &&
                !rlueItem.maxVal
              ) {
                obj = {
                  color: rlueItem.color,
                  value:
                    rlueItem.type === 'field'
                      ? record[rlueItem.fieldKey] + rlueItem.unit
                      : rlueItem.font,
                };
              }
            });
            return (
              <Tooltip
                title={
                  val.describe.showTips ? record[val.describe.tipsCode] : ''
                }
                key={uuidv4()}
              >
                {obj.value && <Tag color={obj.color}>{obj.value}</Tag>}
              </Tooltip>
            );
          });
        break;
      // 复制
      case 'copy':
        node = (
          <div style={{ display: 'flex' }}>
            {TooltipNode}
            {record[val.describe.copyField] && (
              <Paragraph
                copyable={{
                  text: record[val.describe.copyField],
                  onCopy: doCopy,
                  icon: [],
                  tooltips: true,
                }}
              />
            )}
          </div>
        );
        break;
      // 内容过长省略
      case 'ellipsis':
        node = TooltipNode;
        break;
      // 富文本类型
      case 'html':
        node = (
          <Tooltip
            title={
              val.describe.showTips ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: record[val.describe.tipsCode],
                  }}
                />
              ) : (
                ''
              )
            }
          >
            <div
              dangerouslySetInnerHTML={{
                __html:
                  val.describe.showField === 'text'
                    ? val.describe.text
                    : record[val.describe.text],
              }}
            />
          </Tooltip>
        );
        break;
      // Markdown类型
      case 'markdown':
        node = <ReactMarkdown>{record[val.describe.text]}</ReactMarkdown>;
        break;
      // 图片类型
      case 'image':
        node = (
          <Image
            width={val.describe.width}
            src={record[val.describe.urlField]}
          />
        );
        break;
      // 标签与文本组合类型
      case 'tag_text':
        let obj = { color: '', font: '' };
        val.describe.rule.map((rlueItem: any) => {
          if (rlueItem.value === record[val.describe.tagField]) {
            obj = rlueItem;
          }
        });
        node = (
          <>
            {TooltipNode}
            {obj.font && (
              <Tag style={{ marginLeft: 8 }} color={obj.color}>
                {obj.font}
              </Tag>
            )}
          </>
        );
        break;
      // 时间戳转时间格式，format为要转的时间格式
      case 'moment':
        node = (
          <>
            {moment(record[val.describe.timeField]).format(val.describe.format)}
          </>
        );
        break;
      // 自定义
      case 'custom':
        node = (
          <CustomElement
            describe={val.describe}
            dataRecord={record}
            upDateTable={upDateTable}
          />
        );
        break;
      default:
        node = '';
    }
    return node;
  };
  // 初始化表格表头数据整合，特殊字段渲染处理
  useEffect(() => {
    const columnsListData = JSON.parse(JSON.stringify(columnsList));
    if (columnsListData.length) {
      columnsListData.map((item: any) => {
        if (item.sorter) {
          item.sortDirections = ['descend', 'ascend'];
        }
        if (item.operations && item.operations.length) {
          item.render = (text: string, record: any) => (
            <>
              {item.operations.map((val: any, index: number) => {
                return (
                  <span key={uuidv4()} style={{ paddingLeft: index ? 10 : 0 }}>
                    {getActionData(record, item, val)}
                  </span>
                );
              })}
            </>
          );
        }
        if (item.actions && item.actions.length) {
          item.render = (text: string, record: any) => {
            const inlineList: any = [];
            const childList: any = [];
            item.actions.map((val: any) => {
              if (
                !val.describe.positionType ||
                val.describe.positionType === 'inlineNode'
              ) {
                inlineList.push(val);
              }
              if (val.describe.positionType === 'childNode') {
                childList.push(val);
              }
            });

            let nodeList = [];
            nodeList = useMemo(
              () =>
                inlineList.map((val: any, index: number) => {
                  const actionText = getActionData(record, item, val);
                  if (actionText) {
                    return (
                      <span
                        key={uuidv4()}
                        style={{
                          paddingRight: index != inlineList.length - 1 ? 10 : 0,
                        }}
                      >
                        {actionText}
                      </span>
                    );
                  } else {
                    return '';
                  }
                }),
              [columnsListData],
            );
            let menu: any;
            if (childList.length) {
              menu = (
                <Menu key={uuidv4()}>
                  {childList.map((val: any) => {
                    const node = getActionData(record, item, val);
                    return node && <Menu.Item key={uuidv4()}>{node}</Menu.Item>;
                  })}
                </Menu>
              );
            }
            const moreNode = useMemo(
              () => (
                <Dropdown
                  key={uuidv4()}
                  overlay={menu}
                  placement="bottomCenter"
                >
                  <a style={{ paddingLeft: 10 }}>
                    更多 <DownOutlined />
                  </a>
                </Dropdown>
              ),
              [columnsListData],
            );
            if (childList.length) {
              nodeList = [...nodeList, moreNode];
            }
            return nodeList.map((item) => item);
          };
        }
      });
      setColumns(columnsListData);
    }
  }, [columnsList, dataSource]);

  useEffect(() => {
    dataSourceData.current = dataSourceList;
    setDataSource(dataSourceList);
    setPagination(
      pagination
        ? {
          ...tableSummary?.pagination?.pageConfig,
          ...pagination,
          ...{
            current: pagination?.page
              ? pagination.page
              : tableSummary?.pagination?.page,
            pageSize: pagination?.size
              ? pagination.size
              : tableSummary?.pagination?.size,
          },
        }
        : false,
    );
  }, [dataSourceList]);

  // 分页，表头过滤，筛选处理
  const onchange = (pagination: any, filters: any, sorter: any) => {
    console.log(pagination, filters, sorter);
    const filtersList: any = [];
    if (JSON.stringify(filters) !== '{}') {
      const keys = Object.keys(filters);
      keys.map((item) => {
        const obj = {
          fieldName: item,
          fieldValues: Array.isArray(filters[item])
            ? filters[item].join()
            : filters[item],
          filterType: 'IN',
        };
        filtersList.push(obj);
      });
    }
    let sorterList: any = [];
    if (JSON.stringify(sorter) !== '{}' && sorter.order) {
      sorterList = [
        {
          fieldName: sorter.field,
          asc:
            sorter.order === 'ascend'
              ? true
              : sorter.order === 'descend'
                ? false
                : '',
        },
      ];
    }
    const data = {
      page: pagination.current,
      size: pagination.pageSize,
      filters: filtersList,
      orders: [...sorterList],
    };
    tableChange(data);
  };
  // 触发更新表格数据
  const upDateTable = () => {
    tableChange && tableChange({ filters: [] });
  };

  return (
    <>
      <HeaderSetting
        columns={columns}
        onFinish={(columns: any) => setColumns(columns)}
      />
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={
          paginations
            ? {
              ...paginations,
              showTotal: () =>
                paginations.total ? `共 ${paginations.total} 条` : '',
            }
            : paginations
        }
        rowSelection={rowSelection as any}
        rowKey={tableSummary?.rowKey}
        scroll={tableSummary?.scroll}
        onChange={onchange}
        loading={loading}
        className={styles.tableElement}
      />
      {modalInfo.visible && (
        <ModalElement modalInfo={modalInfo} upDateTable={upDateTable} />
      )}
    </>
  );
};
