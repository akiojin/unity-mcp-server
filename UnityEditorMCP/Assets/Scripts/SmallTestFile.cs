using UnityEngine;

// 小サイズテストファイル（約50行）
public class SmallTestFile : MonoBehaviour
{
    private int testValue;
    private string testString;
    
    public void TestMethod()
    {
        testValue = 42;
        testString = "Small test";
        Debug.Log("Small file test method");
    }
    
    private void Calculate()
    {
        for (int i = 0; i < 10; i++)
        {
            testValue += i;
        }
    }
    
    public int GetValue()
    {
        return testValue;
    }
    
    public void SetValue(int value)
    {
        testValue = value;
    }
    
    void Start()
    {
        TestMethod();
        Calculate();
    }
    
    void Update()
    {
        // Simple update logic
        if (Input.GetKeyDown(KeyCode.S))
        {
            Debug.Log("Small test file key pressed");
        }
    }
    
    private void OnDestroy()
    {
        Debug.Log("Small test file destroyed");
    }
}