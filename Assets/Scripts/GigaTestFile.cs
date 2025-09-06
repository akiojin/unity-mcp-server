using System;

namespace TestScripts
{
    public interface IFoo
    {
        void Bar();
    }

    public class FooImpl : IFoo
    {
        void IFoo.Bar() { }
    }

    public enum SomeEnum
    {
        MemberX,
        MemberY
    }

    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Property | AttributeTargets.Event)]
    public class LLMTEST_AttrAttribute : Attribute { }

    public partial class PartialClass
    {
        private void LLMTEST_Helper() { }
    }

    public partial class PartialClass { }

    public class BaseProcessor
    {
        public string GetProcessorName() { return "Base"; }
    }

    public class ProcessorUser
    {
        private BaseProcessor _bp = new BaseProcessor();
        public string UseIt() { return _bp.GetProcessorName(); }
    }

    public class FinalTestClass
    {
        public int Score { get; set; }
        public event Action OnRolled;

        public void TestMethod11() { }
        public void TestMethod12() { }

        public int LLMTEST_ReturnInt()
        {
            return 0;
        }

        [LLMTEST_Attr]
        public void LLMTEST_RenameMe() { }

        [LLMTEST_Attr]
        private void LLMTEST_Attr() { }

        public void Roll() { OnRolled?.Invoke(); }
        public void Roll(int times)
        {
            for (int i = 0; i < times; i++) OnRolled?.Invoke();
        }

        public void GenericMethod<T>(T value) { }
    }

    public class Outer
    {
        public class Inner { }
    }
}

